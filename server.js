require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs-extra');
const app = express();

// Vérification du module mistral.js
try {
  const mistralModule = require('./mistral.js');
  console.log("Module mistral chargé avec succès:", Object.keys(mistralModule));

  // Création des dossiers nécessaires
  const uploadsDir = path.join(__dirname, 'uploads');
  const pdfDir = path.join(uploadsDir, 'pdf');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  // Configuration pour les fichiers PDF
  const storage = multer.diskStorage({
      destination: function (req, file, cb) {
          cb(null, pdfDir);
      },
      filename: function (req, file, cb) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const fileExtension = path.extname(file.originalname);
          cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
      }
  });

  const upload = multer({
      storage: storage,
      limits: { fileSize: 20 * 1024 * 1024 }
  });

  app.use(express.json({ limit: '50mb' }));
  
  // Configuration des routes statiques
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Routes pour les fichiers uploadés - définir des routes complètes
  app.use('/uploads/pdf', express.static(path.join(__dirname, 'uploads', 'pdf')));
  
  // Servir aussi les mêmes chemins depuis public pour la compatibilité
  app.use('/uploads/pdf', express.static(path.join(__dirname, 'public', 'uploads', 'pdf')));
  
  // S'assurer que les dossiers existent
  fs.ensureDirSync(path.join(__dirname, 'uploads', 'pdf'));
  fs.ensureDirSync(path.join(__dirname, 'public', 'uploads', 'pdf'));

  // Endpoint pour générer des notes à partir de texte
  app.post('/generate', async (req, res) => {
      const { text, flashcardCount = 20, qcmCount = 15 } = req.body;
      if (!text) return res.status(400).json({ error: "Le texte est requis" });

      try {
          // Vérifier si le texte est trop long avant même d'essayer de le tronquer
          if (text.length > 400000) { // ~100K tokens
              return res.status(413).json({ 
                  error: "Le texte est trop volumineux pour être traité. Veuillez utiliser un texte plus court ou le diviser en plusieurs parties."
              });
          }
          
          // Limiter la taille du texte pour éviter le dépassement du contexte Mistral
          const truncatedText = truncateText(text, 100000); // Limiter à ~100K tokens
          if (truncatedText.length < text.length) {
              console.log(`Texte tronqué de ${text.length} à ${truncatedText.length} caractères`);
          }
          
          const result = await mistralModule.generateNotes(truncatedText, parseInt(flashcardCount), parseInt(qcmCount));
          
          // Si nous avons une erreur, peu importe le fallback, on renvoie une erreur
          if (result.error) {
              console.error("Erreur lors de la génération:", result.error);
              return res.status(500).json({ 
                  error: result.error,
                  details: result.details
              });
          }
          
          // Si tout s'est bien passé mais que le texte a été tronqué, ajouter un avertissement
          if (truncatedText.length < text.length) {
              result.warning = "Le texte était trop long et a été tronqué pour respecter les limites de l'API. Les résultats peuvent être incomplets.";
          }
          
          res.json(result);
      } catch (err) {
          console.error("Erreur lors de la génération:", err);
          res.status(500).json({ 
              error: "Erreur interne lors de la génération des fiches.",
              details: err.message 
          });
      }
  });

  // Fonction pour tronquer le texte
  function truncateText(text, maxTokens) {
      // Estimation approximative: 1 token ≈ 4 caractères en moyenne
      const maxChars = maxTokens * 4;
      
      if (text.length <= maxChars) {
          return text;
      }
      
      // Tronquer le texte en essayant de garder des phrases complètes
      let truncated = text.substring(0, maxChars);
      
      // Essayer de couper à la fin d'une phrase
      const lastPeriod = truncated.lastIndexOf('.');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastExclamation = truncated.lastIndexOf('!');
      
      // Trouver le dernier marqueur de fin de phrase
      const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
      
      if (lastSentenceEnd > maxChars * 0.8) { // Si nous trouvons une fin de phrase dans les derniers 20%
          truncated = truncated.substring(0, lastSentenceEnd + 1);
      }
      
      return truncated;
  }

  // Extraction du texte du PDF (fonction séparée pour clarté)
  async function extractTextFromPdf(pdfFilePath) {
      try {
          const dataBuffer = fs.readFileSync(pdfFilePath);
          const pdfData = await pdfParse(dataBuffer);
          return pdfData.text;
      } catch (err) {
          console.error("Erreur lors de l'extraction du texte PDF:", err);
          throw new Error("Impossible d'extraire le texte du PDF");
      }
  }



  // Endpoint pour traiter les PDF
  app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
      if (!req.file) {
          return res.status(400).json({ error: "Aucun fichier PDF fourni" });
      }

      try {
          console.log("PDF reçu:", req.file.path);

          // Extraction du texte du PDF en utilisant le chemin du fichier
          const extractedText = await extractTextFromPdf(req.file.path);
          
          // Vérifier si le texte extrait est trop long avant même d'essayer de le tronquer
          if (extractedText.length > 400000) { // ~100K tokens
              return res.status(413).json({ 
                  error: "Le PDF est trop volumineux pour être traité. Veuillez utiliser un document plus court ou le diviser en plusieurs parties."
              });
          }
          
          // Tronquer le texte si nécessaire
          const truncatedText = truncateText(extractedText, 100000);
          if (truncatedText.length < extractedText.length) {
              console.log(`Texte PDF tronqué de ${extractedText.length} à ${truncatedText.length} caractères`);
          }

          // Paramètres de génération
          const flashcardCount = parseInt(req.body.flashcardCount) || 20;
          const qcmCount = parseInt(req.body.qcmCount) || 15;

          console.log("Génération de notes avec:", {
              textLength: truncatedText.length,
              flashcardCount,
              qcmCount
          });

          // Génération des notes
          const result = await mistralModule.generateNotes(truncatedText, flashcardCount, qcmCount);
          
          // Si nous avons une erreur, peu importe le fallback, on renvoie une erreur
          if (result.error) {
              console.error("Erreur lors de la génération du PDF:", result.error);
              return res.status(500).json({ 
                  error: result.error,
                  details: result.details
              });
          }
          
          // Si tout s'est bien passé mais que le texte a été tronqué, ajouter un avertissement
          if (truncatedText.length < extractedText.length) {
              result.warning = "Le texte extrait du PDF était trop long et a été tronqué pour respecter les limites de l'API. Les résultats peuvent être incomplets.";
          }
          

          
          res.json(result);

      } catch (err) {
          console.error("Erreur lors du traitement du PDF:", err);
          res.status(500).json({ 
              error: "Erreur lors du traitement du PDF", 
              details: err.message 
          });
      } finally {
          // Nettoyage du fichier PDF (optionnel, vous pourriez vouloir le conserver)
          if (req.file && req.file.path) {
              fs.unlink(req.file.path, (unlinkErr) => {
                  if (unlinkErr) {
                      console.error("Erreur lors de la suppression du fichier PDF:", unlinkErr);
                  }
              });
          }
      }
  });



  // Middleware pour gérer les erreurs d'accès aux fichiers
  app.use((err, req, res, next) => {
    if (err && err.code === 'ENOENT') {
      console.error(`Fichier non trouvé: ${req.url}`);
    }
    next(err);
  });

  // Gestion des erreurs
  app.use((err, req, res, next) => {
      console.error("Erreur serveur:", err);
      res.status(500).json({
          error: "Une erreur est survenue",
          message: process.env.NODE_ENV === 'development' ? err.message : "Erreur interne du serveur"
      });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });

} catch (moduleErr) {
  console.error("ERREUR CRITIQUE: Le module mistral.js n'a pas pu être chargé:", moduleErr);
  console.error("Assurez-vous que le fichier mistral.js existe et qu'il exporte correctement la fonction generateNotes");
}