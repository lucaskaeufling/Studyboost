/**
 * Script principal de l'application FlashGen
 * Ce script gère toutes les fonctionnalités interactives de l'application:
 * - Gestion des onglets et de l'interface utilisateur
 * - Soumission des données (texte ou PDF) à l'API
 * - Création et affichage des flashcards, QCM et fiches de révision
 * - Exportation des données dans différents formats
 */

// Fonction utilitaire globale pour valider une image
function validImage(url) {
  // Vérifier si l'URL est valide
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Vérifier si ce n'est pas une URL factice utilisée comme placeholder
  if (url === "url_de_l_image" || url === "#" || url === "") {
    return false;
  }
  
  // Vérifier si c'est une URL locale ou externe valide
  return url.startsWith('http') || 
         url.startsWith('/uploads/') || 
         url.startsWith('/public/uploads/') ||
         (url.startsWith('/') && 
          (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')));
}

// Vérification des dépendances
function checkPDFDependencies() {
  // S'assurer que html2pdf est chargé
  const pdfButtons = document.querySelectorAll('.pdf-export-btn, #printRevision');
  
  if (typeof html2pdf === 'undefined') {
    console.error('Bibliothèque html2pdf non chargée !');
    
    // Désactiver les boutons PDF
    pdfButtons.forEach(btn => {
      btn.disabled = true;
      btn.title = 'Export PDF non disponible';
      btn.textContent = 'Export PDF indisponible';
    });
    
    // Optionnel : Afficher un message d'erreur à l'utilisateur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-warning';
    errorDiv.textContent = 'La bibliothèque nécessaire pour générer des PDF est manquante. Merci de contacter le support.';
    
    // Insérer le message d'erreur de manière appropriée dans votre interface
    const targetContainer = document.querySelector('#resultSection') || document.body;
    targetContainer.insertBefore(errorDiv, targetContainer.firstChild);
  }
}

/**
 * Fonction pour imprimer la fiche de révision
 * Ouvre une nouvelle fenêtre avec le contenu formaté pour l'impression
 */
function printRevisionSheet() {
  const element = document.querySelector('.revision-sheet');
  if (!element) {
    alert("Aucune fiche de révision à imprimer !");
    return;
  }

  // Créer une copie pour l'impression
  const printContent = element.cloneNode(true);
  
  // Créer une nouvelle fenêtre
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Impossible d'ouvrir la fenêtre d'impression. Veuillez vérifier que les popups sont autorisés.");
    return;
  }
  
  // Extraire tous les liens CSS existants
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  let stylesheetsHTML = '';
  
  stylesheets.forEach(stylesheet => {
    stylesheetsHTML += stylesheet.outerHTML;
  });
  
  // Optimiser les URLs des images
  const images = printContent.querySelectorAll('img');
  images.forEach(img => {
    // Mettre à jour les attributs src des images pour utiliser des URLs absolues
    if (img.src && !img.src.startsWith('http')) {
      // Si l'image est une image locale, utiliser l'URL absolue
      const currentUrl = new URL(window.location.href);
      const imagePath = img.getAttribute('src');
      
      // Construire une URL absolue et l'attribuer à l'image
      if (imagePath.startsWith('/')) {
        img.src = `${currentUrl.origin}${imagePath}`;
      } else {
        img.src = `${currentUrl.origin}/${imagePath}`;
      }
      
      console.log(`URL d'image mise à jour: ${imagePath} -> ${img.src}`);
    }
    
    // Ajouter un gestionnaire d'erreur pour chaque image
    img.setAttribute('onerror', "this.onerror=null; this.src='/broken-image.png'; console.error('Erreur de chargement image lors de l\\'impression:', this.getAttribute('data-original-src'));");
    img.setAttribute('data-original-src', img.src);
    img.setAttribute('loading', 'eager'); // Charger l'image immédiatement
  });
  
  // Écrire le contenu dans la nouvelle fenêtre
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Impression de la fiche</title>
        <meta charset="UTF-8">
        ${stylesheetsHTML}
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            margin: 0 auto;
          }
          img { max-width: 100%; height: auto; }
          .revision-sheet { 
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
          }
          h2 { color: #4f46e5; text-align: center; }
          h3 { color: #3b82f6; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          
          /* Amélioration pour les images */
          .image-gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            justify-content: center;
            margin-top: 15px;
          }
          .image-container {
            margin: 0;
            flex: 0 0 calc(33.33% - 15px);
            max-width: 250px;
            text-align: center;
          }
          .revision-image {
            width: 100%;
            height: 160px;
            object-fit: contain;
            border-radius: 4px;
            background-color: #f8f8f8;
            margin-bottom: 5px;
          }
          .image-container figcaption {
            font-size: 0.8rem;
            color: #666;
          }
          
          /* Styles pour l'impression */
          @media print {
            body { padding: 0; }
            @page { size: A4; margin: 2cm; }
            .print-button { display: none; }
          }
          
          /* Bouton d'impression */
          .print-button {
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin: 20px auto;
            max-width: 250px;
          }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print(); return false;">
          Imprimer / Enregistrer en PDF
        </button>
        ${printContent.outerHTML}
        <script>
          // Fonction pour vérifier si toutes les images sont chargées
          function checkImagesLoaded() {
            const images = document.querySelectorAll('img');
            let allLoaded = true;
            
            images.forEach(img => {
              if (!img.complete) {
                allLoaded = false;
              }
            });
            
            return allLoaded;
          }
          
          // Attendre que la page soit chargée
          window.addEventListener('load', function() {
            // Gérer les erreurs d'images
            const images = document.querySelectorAll('img');
            let loadedCount = 0;
            
            images.forEach(img => {
              // Si l'image ne se charge pas correctement, la remplacer
              img.onerror = function() {
                console.error('Erreur de chargement image:', this.getAttribute('data-original-src'));
                this.src = '/broken-image.png';
              };
              
              // Quand une image est chargée
              img.onload = function() {
                loadedCount++;
                if (loadedCount === images.length) {
                  console.log('Toutes les images sont chargées');
                }
              };
            });
            
            // Activer le bouton d'impression après un délai pour laisser charger les images
            setTimeout(function() {
              const printButton = document.querySelector('.print-button');
              if (printButton) {
                printButton.disabled = false;
                printButton.textContent = "Imprimer / Enregistrer en PDF";
              }
            }, 1000);
          });
        </script>
      </body>
    </html>
  `);
  
  // Fermer le document et se concentrer sur la fenêtre
  printWindow.document.close();
  printWindow.focus();
}

document.addEventListener('DOMContentLoaded', function() {
  // Vérifier que toutes les bibliothèques externes sont correctement chargées
  checkPDFDependencies();

  // Récupération des éléments DOM principaux de l'interface
  // Boutons et contrôles principaux
  const generateBtn = document.getElementById('generateBtn');     // Bouton de génération des fiches
  const inputText = document.getElementById('inputText');         // Zone de texte pour la saisie
  const resultSection = document.getElementById('resultSection'); // Section des résultats
  const loader = document.getElementById('loader');               // Indicateur de chargement
  
  // Éléments pour la gestion du type d'entrée (texte ou PDF)
  const textInputTab = document.getElementById('textInputTab');   // Onglet saisie de texte
  const uploadPdfBtn = document.getElementById('uploadPdfBtn');   // Onglet upload de PDF
  const pdfUploadForm = document.getElementById('pdfUploadForm'); // Formulaire d'upload PDF
  const pdfFile = document.getElementById('pdfFile');             // Input de fichier PDF
  const fileInfo = document.getElementById('fileInfo');           // Info sur le fichier sélectionné
  const fileName = document.getElementById('fileName');           // Nom du fichier sélectionné
  const removeFile = document.getElementById('removeFile');       // Bouton pour supprimer le fichier
  
  // Options de génération
  const flashcardCount = document.getElementById('flashcardCount'); // Nombre de flashcards à générer
  const qcmCount = document.getElementById('qcmCount');             // Nombre de questions QCM à générer

  // Conteneurs de résultats
  const flashcardsContainer = document.getElementById('flashcardsContainer');
  const qcmContainer = document.getElementById('qcmContainer');
  const revisionContainer = document.getElementById('revisionContainer');
  
  // Navigation Flashcards
  const prevCard = document.getElementById('prevCard');
  const nextCard = document.getElementById('nextCard');
  const cardCounter = document.getElementById('cardCounter');
  const checkAnswers = document.getElementById('checkAnswers');
  const printRevision = document.getElementById('printRevision');

  // Configuration du bouton d'impression pour la fiche de révision
  if (printRevision) {
    printRevision.addEventListener('click', function() {
      printRevisionSheet();
    });
  }

  // Gestion du système d'onglets principal (Créer des fiches / À propos)
  const tabBtns = document.querySelectorAll('.tab-btn');         // Boutons des onglets
  const tabContents = document.querySelectorAll('.tab-content');  // Contenus des onglets
  
  // Ajouter des écouteurs d'événements à chaque bouton d'onglet
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;  // Récupérer le nom de l'onglet à partir de l'attribut data-tab
      
      // Désactiver tous les onglets (retirer la classe 'active')
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Activer uniquement l'onglet sélectionné
      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  // Gestion des tabs de résultat
  const resultTabBtns = document.querySelectorAll('.result-tab-btn');
  const resultTabContents = document.querySelectorAll('.result-tab-content');
  
  resultTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.resultTab;
      
      // Désactivation de tous les tabs
      resultTabBtns.forEach(b => b.classList.remove('active'));
      resultTabContents.forEach(c => c.classList.remove('active'));
      
      // Activation du tab sélectionné
      btn.classList.add('active');
      document.getElementById(`${tabName}-content`).classList.add('active');
    });
  });

  // Gestion de l'input (texte vs PDF)
  textInputTab.addEventListener('click', () => {
    textInputTab.classList.add('active');
    uploadPdfBtn.classList.remove('active');
    inputText.classList.remove('hidden');
    pdfUploadForm.classList.add('hidden');
  });

  uploadPdfBtn.addEventListener('click', () => {
    uploadPdfBtn.classList.add('active');
    textInputTab.classList.remove('active');
    inputText.classList.add('hidden');
    pdfUploadForm.classList.remove('hidden');
  });

  // Gestion du fichier PDF
  pdfFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileName.textContent = file.name;
      fileInfo.classList.remove('hidden');
    }
  });

  removeFile.addEventListener('click', () => {
    pdfFile.value = '';
    fileName.textContent = '';
    fileInfo.classList.add('hidden');
  });

  // Variables pour les flashcards
  let currentFlashcardIndex = 0;
  let flashcards = [];
  

  /**
   * Gestionnaire d'événement pour le bouton de génération des fiches
   * Récupère les données saisies, les envoie à l'API et affiche les résultats
   */
  generateBtn.addEventListener('click', async function() {
    // Validation des données d'entrée
    let hasInput = false;
    let formData = null;
    
    // Vérifier le type d'entrée actif (texte ou PDF)
    if (textInputTab.classList.contains('active')) {
      // Mode texte: vérifier que le texte n'est pas vide
      if (inputText.value.trim() === "") {
        alert("Veuillez entrer du texte avant de générer !");
        return;
      }
      
      // Avertir l'utilisateur si le texte est très long
      if (inputText.value.length > 400000) { // ~100K tokens
        const confirmGeneration = confirm("Votre texte est très long et sera probablement tronqué pour respecter les limites de l'API. Continuer quand même ?");
        if (!confirmGeneration) {
          return;
        }
      }
      
      hasInput = true;
    } else if (pdfFile.files.length > 0) {
      // Mode PDF: préparer les données du formulaire
      formData = new FormData();
      formData.append('pdf', pdfFile.files[0]);
      formData.append('flashcardCount', flashcardCount.value);
      formData.append('qcmCount', qcmCount.value);
      
      // Avertir pour les fichiers PDF volumineux
      if (pdfFile.files[0].size > 10 * 1024 * 1024) { // 10 MB
        const confirmGeneration = confirm("Votre fichier PDF est volumineux et le texte extrait sera peut-être tronqué pour respecter les limites de l'API. Continuer quand même ?");
        if (!confirmGeneration) {
          return;
        }
      }
      
      hasInput = true;
    } else {
      // Aucun fichier PDF sélectionné
      alert("Veuillez sélectionner un fichier PDF !");
      return;
    }

    // Afficher l'indicateur de chargement et désactiver le bouton
    loader.classList.remove('hidden');
    generateBtn.disabled = true;

    try {
      let response;
      
      // Envoyer la requête à l'API selon le type d'entrée
      if (formData) {
        // Cas d'un fichier PDF: envoyer à l'endpoint /upload-pdf
        response = await fetch('/upload-pdf', {
          method: 'POST',
          body: formData
        });
      } else {
        // Cas d'un texte: envoyer à l'endpoint /generate
        response = await fetch('/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: inputText.value,
            flashcardCount: parseInt(flashcardCount.value),
            qcmCount: parseInt(qcmCount.value)
          })
        });
      }

      // Vérifier si la requête a réussi
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      // Récupérer les données générées
      const data = await response.json();
      
      // Vérifier s'il y a une erreur qui nécessite un arrêt complet
      if (data.error || (data.warning && data.warning.includes("trop volumineux"))) {
        // Afficher l'erreur dans une alerte et arrêter la génération
        alert(`Erreur: ${data.error || data.warning}\n\nSuggestion: Réduisez la taille du texte ou divisez-le en plusieurs parties.`);
        // Masquer le loader et réactiver le bouton
        loader.classList.add('hidden');
        generateBtn.disabled = false;
        return; // Arrêter la génération ici
      }

      // Afficher un avertissement non bloquant (pour d'autres types d'avertissements)
      if (data.warning && !data.warning.includes("trop volumineux")) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${data.warning}`;
        warningDiv.style.backgroundColor = '#fff8e1';
        warningDiv.style.color = '#856404';
        warningDiv.style.padding = '10px 15px';
        warningDiv.style.marginBottom = '15px';
        warningDiv.style.borderRadius = '4px';
        warningDiv.style.borderLeft = '4px solid #ffc107';
        
        // Supprimer les avertissements précédents s'il y en a
        const existingWarnings = resultSection.querySelectorAll('.warning-message');
        existingWarnings.forEach(el => el.remove());
        
        // Ajouter l'avertissement au début de la section de résultat
        resultSection.prepend(warningDiv);
      }

      // Logs pour le débogage
      console.log("data.flashcards:", data.flashcards);
      const flashcardsToDisplay = data.flashcards;
      console.log("flashcardsToDisplay =", flashcardsToDisplay.length);

      // Stocker les données générées dans une variable globale pour les exports
      window.generatedData = {
        flashcards: flashcardsToDisplay,
        qcm: data.qcm,
        revision: data.revision
      };

      // Créer les différents types de contenu
      createFlashcards(flashcardsToDisplay);  // Flashcards
      createQCM(data.qcm);                    // Questions à choix multiples
      createRevisionSheet(data.revision);      // Fiche de révision
      
      // Afficher la section des résultats et faire défiler jusqu'à elle
      resultSection.classList.remove('hidden');
      window.scrollTo({
        top: resultSection.offsetTop,
        behavior: 'smooth'
      });
      
    } catch (error) {
      // Gérer les erreurs avec un pop-up
      console.error("Erreur :", error);
      
      // Afficher un message d'alerte pour l'utilisateur
      alert(`Une erreur est survenue: ${error.message}\n\nSuggestions:\n- Réduire la taille du texte source\n- Utiliser un PDF moins volumineux\n- Diviser votre contenu en parties plus petites`);
      
      // Ne pas afficher la section de résultat
      resultSection.classList.add('hidden');
    } finally {
      // Toujours cacher le loader et réactiver le bouton à la fin
      loader.classList.add('hidden');
      generateBtn.disabled = false;
    }
  });

  /**
   * Crée et affiche les flashcards interactives à partir des données générées
   * @param {Array} cards - Tableau d'objets contenant les flashcards (question, réponse, image)
   */
  function createFlashcards(cards) {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      flashcardsContainer.innerHTML = '<p class="error">Aucune flashcard générée.</p>';
      return;
    }
    
    // Stocker les flashcards dans une variable globale
    flashcards = cards;
    currentFlashcardIndex = 0;
    
    // Créer la structure HTML de base pour les flashcards
    flashcardsContainer.innerHTML = `
      <div class="flashcard">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <div class="card-front"></div>
          </div>
          <div class="flashcard-back">
            <div class="card-back"></div>
          </div>
        </div>
        <div class="card-image"></div>
      </div>
    `;
    
    // Ajouter l'événement de clic pour retourner la carte
    const flashcard = document.querySelector('.flashcard');
    flashcard.addEventListener('click', function() {
      this.classList.toggle('flipped');
    });
    
    // Afficher la première flashcard
    displayFlashcard(0);
    
    // Activer les boutons de navigation
    prevCard.disabled = true; // Désactiver le bouton précédent pour la première carte
    nextCard.disabled = cards.length <= 1; // Désactiver le bouton suivant s'il n'y a qu'une seule carte
    
    // Ajouter les écouteurs d'événements pour les boutons de navigation
    prevCard.addEventListener('click', function() {
      if (currentFlashcardIndex > 0) {
        displayFlashcard(currentFlashcardIndex - 1);
        nextCard.disabled = false;
        prevCard.disabled = currentFlashcardIndex === 0;
      }
    });
    
    nextCard.addEventListener('click', function() {
      if (currentFlashcardIndex < cards.length - 1) {
        displayFlashcard(currentFlashcardIndex + 1);
        prevCard.disabled = false;
        nextCard.disabled = currentFlashcardIndex === cards.length - 1;
      }
    });
    
    // Ajouter le bouton d'exportation Anki
    addAnkiExportButton();
    
    // Ajouter des styles CSS pour les images de flashcards
    const style = document.createElement('style');
    style.textContent = `
      .card-image {
        width: 100%;
        margin: 15px auto;
        text-align: center;
        max-height: 200px;
      }
      .card-image img {
        max-width: 100%;
        max-height: 200px;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        background-color: #f8f8f8;
      }
    `;
    document.head.appendChild(style);
  }

  // Correction pour la fonction displayFlashcard
  async function displayFlashcard(index) {
    // Vérifier que l'index est valide
    if (index < 0 || index >= flashcards.length) return;

    // Mettre à jour l'index courant
    currentFlashcardIndex = index;

    // Récupérer la flashcard active
    const flashcard = flashcards[index];

    // Récupérer les éléments de la carte
    const cardFront = document.querySelector('.card-front');
    const cardBack = document.querySelector('.card-back');
    const cardImage = document.querySelector('.card-image');

    // Mise à jour du contenu
    cardFront.innerHTML = `<p>${flashcard.question}</p>`;
    cardBack.innerHTML = `<p>${flashcard.answer}</p>`;

    // Gestion de l'image (si présente)
    if (validImage(flashcard.image)) {
      cardImage.innerHTML = `
        <img src="${flashcard.image}" alt="Image contexte" class="flashcard-image"
             onerror="this.onerror=null; this.src='/broken-image.png'; console.error('Erreur de chargement image flashcard:', '${flashcard.image}');" />
      `;
      cardImage.style.display = 'block';
    } else {
      cardImage.style.display = 'none';
      cardImage.innerHTML = '';
    }

    // Mise à jour du compteur
    updateCardCounter();
  }

  // Mise à jour du compteur de cartes
  function updateCardCounter() {
    if (flashcards && flashcards.length > 0) {
      cardCounter.textContent = `${currentFlashcardIndex + 1}/${flashcards.length}`;
    } else {
      cardCounter.textContent = '0/0';
    }
  }

  // Crée le QCM interactif
  function createQCM(questions) {
    qcmContainer.innerHTML = '';
    
    if (!questions || questions.length === 0) {
      qcmContainer.innerHTML = '<p class="error">Aucune question générée.</p>';
      return;
    }
    
    questions.forEach((q, questionIndex) => {
      const questionElement = document.createElement('div');
      questionElement.className = 'qcm-question';
      
      let optionsHTML = '';
      q.options.forEach((option, optionIndex) => {
        optionsHTML += `
          <div class="qcm-option">
            <input type="radio" id="q${questionIndex}_o${optionIndex}" 
                   name="q${questionIndex}" value="${optionIndex}" />
            <label for="q${questionIndex}_o${optionIndex}">${option}</label>
            <span class="qcm-feedback"></span>
          </div>
        `;
      });
      
      questionElement.innerHTML = `
        <h3 class="qcm-question-text">${q.question}</h3>
        <div class="qcm-options" data-correct="${q.correct}">
          ${optionsHTML}
        </div>
      `;
      
      qcmContainer.appendChild(questionElement);
    });
    
    // Réinitialiser le bouton de vérification
    checkAnswers.disabled = false;
    checkAnswers.innerHTML = '<i class="fas fa-check"></i> Vérifier mes réponses';
  }

  // Fonction pour précharger une image et vérifier si elle est valide
  function preloadImage(url) {
    return new Promise((resolve) => {
      if (!validImage(url)) {
        console.log('URL invalide:', url);
        resolve(false);
        return;
      }
      
      const img = new Image();
      img.crossOrigin = "anonymous";  // Ajout pour éviter les problèmes CORS
      img.onload = function() {
        console.log('Image chargée avec succès:', url, `(${this.width}x${this.height})`);
        resolve(true);
      };
      img.onerror = function() {
        console.error('Erreur de chargement image:', url);
        // Si l'image ne se charge pas, on utilise une image de remplacement
        img.src = '/broken-image.png';
        resolve(false);
      };
      img.src = url;
      
      // Timeout après 5 secondes
      setTimeout(() => {
        if (!img.complete) {
          console.error('Timeout lors du chargement de l\'image:', url);
          resolve(false);
        }
      }, 5000);
    });
  }
  
  // Fonction utilitaire pour créer une balise img avec fallback
  function createImageTag(src, alt, className) {
    return `
      <img src="${src}" alt="${alt}" class="${className}"
           onerror="this.onerror=null; this.src='/broken-image.png'; console.error('Erreur de chargement image, utilisation image de remplacement:', '${src}');" />
    `;
  }
  
  // Vérification des réponses du QCM
  checkAnswers.addEventListener('click', function() {
    const questionContainers = qcmContainer.querySelectorAll('.qcm-options');
    let score = 0;
    let totalQuestions = questionContainers.length;
    
    questionContainers.forEach(container => {
      const correctAnswer = parseInt(container.dataset.correct);
      const selectedOption = container.querySelector('input:checked');
      const options = container.querySelectorAll('.qcm-option');
      
      options.forEach((option, index) => {
        const feedback = option.querySelector('.qcm-feedback');
        
        if (index === correctAnswer) {
          option.classList.add('correct-answer');
          feedback.innerHTML = '<i class="fas fa-check"></i>';
        } else {
          feedback.innerHTML = '';
        }
      });
      
      if (selectedOption) {
        const selectedValue = parseInt(selectedOption.value);
        const selectedOptionDiv = selectedOption.closest('.qcm-option');
        
        if (selectedValue === correctAnswer) {
          score++;
        } else {
          selectedOptionDiv.classList.add('wrong-answer');
          selectedOptionDiv.querySelector('.qcm-feedback').innerHTML = '<i class="fas fa-times"></i>';
        }
      }
    });
    
    // Afficher le score
    this.innerHTML = `<i class="fas fa-check"></i> Score: ${score}/${totalQuestions}`;
    this.disabled = true;
  });

  // Crée la fiche de révision complète
  function createRevisionSheet(revision) {
    if (!revision) {
      revisionContainer.innerHTML = '<p class="error">Aucune fiche de révision générée.</p>';
      return;
    }
    
    // HTML pour l'introduction
    const introductionHTML = revision.introduction ? 
      `<div class="revision-introduction">
        <h3>Introduction 📋</h3>
        <p>${revision.introduction}</p>
      </div>` : '';
    
    // HTML pour le résumé
    const summaryHTML = revision.summary ?
      `<div class="revision-summary">
        <h3>Résumé 📝</h3>
        <p>${revision.summary}</p>
      </div>` : '';
    
    // HTML pour les définitions
    let definitionsHTML = '';
    if (revision.definitions && revision.definitions.length > 0) {
      definitionsHTML = `
        <div class="revision-definitions">
          <h3>Définitions clés 📚</h3>
          <dl class="definitions-list">
      `;
      
      revision.definitions.forEach(def => {
        if (typeof def === 'object' && def.term && def.definition) {
          definitionsHTML += `
            <dt><strong>${def.term}</strong></dt>
            <dd>${def.definition}</dd>
          `;
        } else if (typeof def === 'string') {
          definitionsHTML += `<p>${def}</p>`;
        }
      });
      
      definitionsHTML += `
          </dl>
        </div>
      `;
    }
    
    // HTML pour la méthodologie
    const methodologyHTML = revision.methodology ?
      `<div class="revision-methodology">
        <h3>Méthodologie 🔍</h3>
        <p>${revision.methodology}</p>
      </div>` : '';
    
    // HTML pour les exemples
    let examplesHTML = '';
    if (revision.examples && revision.examples.length > 0) {
      examplesHTML = `
        <div class="revision-examples">
          <h3>Exemples concrets 💡</h3>
          <ul class="examples-list">
      `;
      
      revision.examples.forEach(example => {
        examplesHTML += `<li>${example}</li>`;
      });
      
      examplesHTML += `
          </ul>
        </div>
      `;
    }
    
    // HTML pour les applications pratiques
    const applicationsHTML = revision.practical_applications ?
      `<div class="revision-applications">
        <h3>Applications pratiques 🛠️</h3>
        <p>${revision.practical_applications}</p>
      </div>` : '';
    
    // HTML pour les points clés
    let keyPointsHTML = '';
    if (revision.key_points && revision.key_points.length > 0) {
      keyPointsHTML = `
        <div class="revision-key-points">
          <h3>Points clés 🔑</h3>
          <ul class="key-points">
      `;
      
      revision.key_points.forEach(point => {
        keyPointsHTML += `<li>${point}</li>`;
      });
      
      keyPointsHTML += `
          </ul>
        </div>
      `;
    }
    
    // HTML pour "À retenir absolument"
    let mustKnowHTML = '';
    if (revision.must_know && revision.must_know.length > 0) {
      mustKnowHTML = `
        <div class="revision-must-know">
          <h3>À retenir absolument 🌟</h3>
          <ul class="must-know-list">
      `;
      
      revision.must_know.forEach(item => {
        mustKnowHTML += `<li>${item}</li>`;
      });
      
      mustKnowHTML += `
          </ul>
        </div>
      `;
    }
    
    // HTML pour la conclusion
    const conclusionHTML = revision.conclusion ?
      `<div class="revision-conclusion">
        <h3>Conclusion 🏁</h3>
        <p>${revision.conclusion}</p>
      </div>` : '';
    
    // HTML pour les conseils de révision
    let tipsHTML = '';
    if (revision.tips && revision.tips.length > 0) {
      tipsHTML = `
        <div class="revision-tips">
          <h3>Conseils de révision 🧠</h3>
          <ul class="tips-list">
      `;
      
      revision.tips.forEach(tip => {
        tipsHTML += `<li>${tip}</li>`;
      });
      
      tipsHTML += `
          </ul>
        </div>
      `;
    }
    
    // HTML pour les images
    const imagesHTML = createImagesHTML(revision);

    // Assembler tous les éléments de la fiche de révision
    revisionContainer.innerHTML = `
      <div class="revision-sheet">
        <h2 class="revision-title">${revision.title}</h2>
        ${introductionHTML}
        ${summaryHTML}
        ${definitionsHTML}
        ${methodologyHTML}
        ${examplesHTML}
        ${applicationsHTML}
        ${keyPointsHTML}
        ${mustKnowHTML}
        ${conclusionHTML}
        ${tipsHTML}
        ${imagesHTML}
      </div>
    `;

    // Ajouter du CSS pour améliorer l'apparence
    const style = document.createElement('style');
    style.textContent = `
      .revision-sheet {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .revision-title {
        text-align: center;
        margin-bottom: 20px;
        color: #2563eb;
      }
      .revision-sheet h3 {
        margin-top: 20px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
        color: #3b82f6;
      }
      .revision-sheet dl dt {
        font-weight: bold;
        margin-top: 10px;
      }
      .revision-sheet dl dd {
        margin-left: 20px;
        margin-bottom: 10px;
      }
      .revision-sheet ul {
        padding-left: 20px;
      }
      .revision-sheet ul li {
        margin-bottom: 8px;
      }
      .image-gallery {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        justify-content: center;
        margin-top: 15px;
      }
      .image-container {
        margin: 0;
        flex: 0 0 calc(33.33% - 15px);
        max-width: 250px;
        text-align: center;
      }
      .revision-image {
        width: 100%;
        height: 160px;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        background-color: #f8f8f8;
        margin-bottom: 5px;
      }
      .image-container figcaption {
        font-size: 0.8rem;
        color: #666;
      }
      .image-error, .image-loading {
        width: 100%;
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f8f8f8;
        color: #e53e3e;
        border-radius: 4px;
        font-size: 0.9rem;
        text-align: center;
        margin-bottom: 5px;
      }
      .image-loading {
        color: #2563eb;
      }
      @media (max-width: 768px) {
        .image-container {
          flex: 0 0 calc(50% - 15px);
        }
      }
      @media (max-width: 480px) {
        .image-container {
          flex: 0 0 100%;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Configurer les boutons d'exportation
    addExportButtons();
  }
  
  // Fonction pour exporter les flashcards au format Anki (.txt)
  function exportToAnki(flashcards) {
    if (!flashcards || flashcards.length === 0) {
      alert("Aucune flashcard à exporter !");
      return;
    }

    // Créer le contenu au format compatible Anki (séparé par des tabulations)
    let content = '';
    
    // Ajouter chaque flashcard (question et réponse séparés par des tabulations)
    flashcards.forEach(card => {
      // Nettoyer le contenu pour éviter les problèmes de formatage
      const question = card.question.replace(/\n/g, '<br>').replace(/\t/g, ' ');
      const answer = card.answer.replace(/\n/g, '<br>').replace(/\t/g, ' ');
      
      // Ajouter l'image si elle existe
      const imageTag = card.image && card.image !== "" && card.image !== "url_de_l_image" 
        ? `<img src="${card.image}">` 
        : '';
      
      // Format: Question [Tab] Réponse [Tab] Image
      content += `${question}\t${answer}\t${imageTag}\n`;
    });
    
    // Créer un blob et un lien de téléchargement
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Créer un élément a pour le téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards_anki.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert("Fichier prêt pour l'importation dans Anki !\nPour importer dans Anki:\n1. Ouvrez Anki\n2. Cliquez sur 'Importer un fichier'\n3. Sélectionnez le fichier téléchargé\n4. Assurez-vous que le type de champ est configuré pour correspondre à vos données");
  }

  // Ajout du bouton d'exportation Anki dans l'interface
  function addAnkiExportButton() {
    const flashcardsControls = document.querySelector('.flashcards-controls');
    
    if (flashcardsControls) {
      // Vérifier si le bouton existe déjà
      let exportBtn = document.getElementById('exportAnki');
      if (exportBtn) {
        exportBtn.remove(); // Supprimer l'ancien bouton s'il existe
      }
      
      // Créer un nouveau bouton
      exportBtn = document.createElement('button');
      exportBtn.id = 'exportAnki';
      exportBtn.className = 'secondary-btn';
      exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Exporter vers Anki';
      exportBtn.addEventListener('click', () => exportToAnki(flashcards));
      
      // Ajouter le bouton après les contrôles de navigation
      flashcardsControls.appendChild(exportBtn);
    }
  }

  // Fonction pour exporter la fiche de révision au format Markdown
  function exportToMarkdown() {
    const revision = window.generatedData?.revision;
    
    if (!revision) {
      alert("Aucune fiche de révision à exporter !");
      return;
    }
    
    // Construire le contenu Markdown
    let markdown = `# ${revision.title}\n\n`;
    
    // Introduction
    if (revision.introduction) {
      markdown += `## Introduction 📋\n\n${revision.introduction}\n\n`;
    }
    
    // Résumé
    if (revision.summary) {
      markdown += `## Résumé 📝\n\n${revision.summary}\n\n`;
    }
    
    // Définitions
    if (revision.definitions && revision.definitions.length > 0) {
      markdown += `## Définitions clés 📚\n\n`;
      
      revision.definitions.forEach(def => {
        if (typeof def === 'object' && def.term && def.definition) {
          markdown += `**${def.term}**: ${def.definition}\n\n`;
        } else if (typeof def === 'string') {
          markdown += `${def}\n\n`;
        }
      });
    }
    
    // Méthodologie
    if (revision.methodology) {
      markdown += `## Méthodologie 🔍\n\n${revision.methodology}\n\n`;
    }
    
    // Exemples
    if (revision.examples && revision.examples.length > 0) {
      markdown += `## Exemples concrets 💡\n\n`;
      
      revision.examples.forEach(example => {
        markdown += `- ${example}\n`;
      });
      
      markdown += '\n';
    }
    
    // Applications pratiques
    if (revision.practical_applications) {
      markdown += `## Applications pratiques 🛠️\n\n${revision.practical_applications}\n\n`;
    }
    
  
    // Points clés
    if (revision.key_points && revision.key_points.length > 0) {
      markdown += `## Points clés 🔑\n\n`;
      
      revision.key_points.forEach(point => {
        markdown += `- ${point}\n`;
      });
      
      markdown += '\n';
    }
    
    // À retenir absolument
    if (revision.must_know && revision.must_know.length > 0) {
      markdown += `## À retenir absolument 🌟\n\n`;
      
      revision.must_know.forEach(item => {
        markdown += `- ${item}\n`;
      });
      
      markdown += '\n';
    }
    
    // Conclusion
    if (revision.conclusion) {
      markdown += `## Conclusion 🏁\n\n${revision.conclusion}\n\n`;
    }
    
    // Conseils de révision
    if (revision.tips && revision.tips.length > 0) {
      markdown += `## Conseils de révision 🧠\n\n`;
      
      revision.tips.forEach(tip => {
        markdown += `- ${tip}\n`;
      });
      
      markdown += '\n';
    }
    
    // Images
    if (revision.images && Array.isArray(revision.images) && revision.images.length > 0) {
      const validImages = revision.images.filter(img => {
        return img && typeof img === 'string' && img !== "url_de_l_image" && 
              (img.startsWith('http') || img.startsWith('/uploads/'));
      });
      
      if (validImages.length > 0) {
        markdown += `## Images illustratives 🖼️\n\n`;
        
        validImages.forEach((img, index) => {
          markdown += `![Image ${index + 1}](${img})\n\n`;
        });
      }
    }
    
    // Créer un blob et un lien de téléchargement
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    // Créer un élément a pour le téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revision_notes.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert("Fichier Markdown téléchargé! Vous pouvez l'importer dans Notes Apple ou tout autre éditeur qui prend en charge le format Markdown.");
  }

  // Fonction pour ajouter les boutons d'exportation à l'interface
function addExportButtons() {
  // Trouver le bouton d'impression existant
  const printBtn = document.getElementById('printRevision');
  if (!printBtn) {
    console.error("Bouton d'impression non trouvé dans le DOM.");
    return;
  }

  const revisionButtons = printBtn.parentNode;
  if (!revisionButtons) {
    console.error("Le bouton d'impression n'a pas de parent dans le DOM.");
    return;
  }

  // Supprimer l'ancien bouton s'il existe
  const existingMarkdownBtn = document.getElementById('exportMarkdown');
  if (existingMarkdownBtn) {
    existingMarkdownBtn.remove();
  }

  // Créer le nouveau bouton
  const markdownBtn = document.createElement('button');
  markdownBtn.id = 'exportMarkdown';
  markdownBtn.className = 'secondary-btn';
  markdownBtn.innerHTML = '<i class="fas fa-file-alt"></i> Exporter pour Notes';
  
  // Ajouter l'écouteur d'événement
  markdownBtn.addEventListener('click', () => {
    const currentRevision = window.generatedData?.revision;
    exportToMarkdown(currentRevision);
  });

  // Ajouter le bouton au DOM
  revisionButtons.appendChild(markdownBtn);
  console.log("Bouton 'Exporter sous Markdown' configuré.");
}

  
    // Tous les éléments principaux et code existant...
    
    // MODIFICATIONS À APPORTER AU CODE EXISTANT

    // 1. Modifier la fonction createFlashcards pour ajouter le bouton d'exportation Anki
    const originalCreateFlashcards = createFlashcards;
    createFlashcards = function(cards) {
      // Appeler la fonction originale
      originalCreateFlashcards(cards);
      
      // Ajouter le bouton d'exportation Anki
      const flashcardsControls = document.querySelector('.flashcards-controls');
      
      // Vérifier si le bouton existe déjà et le supprimer si c'est le cas
      const existingButton = document.getElementById('exportAnki');
      if (existingButton) {
        existingButton.remove();
      }
      
      if (flashcardsControls && cards && cards.length > 0) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportAnki';
        exportBtn.className = 'secondary-btn';
        exportBtn.style.marginLeft = '10px';
        exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Exporter vers Anki';
        exportBtn.addEventListener('click', () => exportToAnki(cards));
        
        // Ajouter le bouton après les contrôles de navigation
        flashcardsControls.appendChild(exportBtn);
      }
    };

    // 2. Modifier la fonction createRevisionSheet pour stocker les données de révision
    const originalCreateRevisionSheet = createRevisionSheet;
    createRevisionSheet = function(revision) {
      // Stocker les données de révision pour l'exportation
      window.generatedData = window.generatedData || {};
      window.generatedData.revision = revision;
      
      // Appeler la fonction originale
      originalCreateRevisionSheet(revision);
      
      // Ajouter les boutons d'exportation
      addExportButtons();
    };

    // 3. Modifier la fonction generateBtn.addEventListener pour stocker les données générées
    const originalGenerateBtnClick = generateBtn.onclick || function(){};
    generateBtn.onclick = async function(event) {
      const result = await originalGenerateBtnClick.call(this, event);
      
      // Le gestionnaire d'événements existant s'occupe déjà de tout,
      // nous n'avons rien de plus à faire ici
      
      return result;
    };
  });

// HTML pour les images dans la fiche de révision
function createImagesHTML(revision) {
  let imagesHTML = '';
  if (revision.images && Array.isArray(revision.images) && revision.images.length > 0) {
    // Filtrer les images valides
    const validImages = revision.images.filter(img => validImage(img));

    if (validImages.length > 0) {
      imagesHTML = `
        <div class="revision-images">
          <h3>Images illustratives 🖼️</h3>
          <div class="image-gallery">
      `;

      validImages.forEach((img, index) => {
        imagesHTML += `
          <figure class="image-container">
            <img src="${img}" alt="Image illustrative ${index+1}" class="revision-image"
                 onerror="this.onerror=null; this.src='/broken-image.png'; console.error('Erreur de chargement image:', '${img}');" />
            <figcaption>Image ${index+1}</figcaption>
          </figure>
        `;
      });

      imagesHTML += `
          </div>
        </div>
      `;
    }
  }
  return imagesHTML;
}

