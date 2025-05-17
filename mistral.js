const axios = require('axios');
require("dotenv").config({ path: './clef.env' });

async function generateNotes(input, flashcardCount = 20, qcmCount = 15, pdfImages = []) {
  // Vérifier la taille de l'entrée et renvoyer une erreur si elle est trop grande
  const maxInputLength = 100000; // ~25K tokens
  if (input.length > 400000) {
    return {
      error: "Le texte source est trop volumineux pour être traité (plus de 400 000 caractères). Veuillez réduire la taille du texte.",
      details: { inputLength: input.length, maxRecommended: 400000 }
    };
  }
  
  let truncatedInput = input;
  if (input.length > maxInputLength) {
    console.warn(`Input trop long (${input.length} caractères), troncature à ${maxInputLength} caractères.`);
    truncatedInput = input.substring(0, maxInputLength);
    // Couper à la fin d'une phrase complète pour plus de cohérence
    const lastPeriod = truncatedInput.lastIndexOf('.');
    if (lastPeriod > maxInputLength * 0.8) {
      truncatedInput = truncatedInput.substring(0, lastPeriod + 1);
    }
  }

  // Indiquer au modèle qu'il y a des images disponibles, mais sans inclure les URLs
  const imageInfo = pdfImages.length > 0 
    ? `\n\nINFORMATION: ${pdfImages.length} images ont été extraites du document. Ces images seront ajoutées après la génération.`
    : '';

  const prompt = `
Tu es un assistant spécialisé dans la création de fiches de révision détaillées et visuelles. Voici un contenu à transformer en matériel d'étude complet:

"${truncatedInput}"

IMPORTANT: Tu dois produire EXACTEMENT ${flashcardCount} flashcards, ni plus ni moins. C'est une exigence absolue.

Crée:
1. EXACTEMENT ${flashcardCount} flashcards avec une question au recto et la réponse au verso.
2. ${qcmCount} questions QCM, chacune ayant 4 options et une seule réponse correcte.
3. Une fiche de révision DÉTAILLÉE du contenu (1-2 pages complètes), incluant:
   - Un titre accrocheur avec emoji
   - Une introduction/présentation du sujet (2-3 paragraphes)
   - Un résumé structuré des concepts principaux
   - Une section "Définitions clés" avec au moins 5-10 termes importants
   - Une section "Méthodologie" ou "Étapes" si applicable
   - Des exemples concrets illustrant les concepts
   - Une section "Applications pratiques"
   - Des points à retenir absolument (5-10 points essentiels)
   - Une conclusion qui synthétise les idées principales (1-2 paragraphes)
   ${imageInfo}

INSTRUCTIONS IMPORTANTES:
- Utilise des émojis pertinents si tu en as un dans le contexte dans les titres de sections et les points clés (🔑, 📝, 📊, 🔍, 🧠, etc.)
- Formate le texte avec des titres, sous-titres, listes à puces, tableaux si pertinent
- Structure ta fiche de révision comme un vrai document pédagogique, pas comme une simple liste
- Inclus des conseils méthodologiques concrets pour réviser le sujet efficacement


Formate ta réponse en JSON avec cette structure exacte:
{
  "flashcards": [
    {"question": "Question 1?", "answer": "Réponse 1", "image": ""}
  ],
  "qcm": [
    {
      "question": "Question 1?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ],
  "revision": {
    "title": "Titre complet du sujet avec emoji",
    "introduction": "Paragraphes d'introduction expliquant le contexte et l'importance du sujet",
    "summary": "Résumé détaillé des concepts principaux avec une introduction sur le projet",
    "definitions": [
      {"term": "Terme 1", "definition": "Définition détaillée 1"},
      {"term": "Terme 2", "definition": "Définition détaillée 2"}
    ],
    "methodology": "Description des méthodologies ou processus liés au sujet",
    "examples": ["Exemple détaillé 1", "Exemple détaillé 2"],
    "practical_applications": "Comment appliquer ces connaissances dans la pratique",
    "key_points": ["Point clé 1 🔑", "Point clé 2 🔑"],
    "must_know": ["Élément essentiel 1 🌟", "Élément essentiel 2 🌟"],
    "conclusion": "Synthèse finale et ouverture",
    "tips": ["Conseil de révision 1", "Conseil de révision 2"],
    "structure": ["Section 1", "Section 2"],
    "images": []
  }
}

Avant d'envoyer ta réponse, vérifie que ton tableau de flashcards contient bien ${flashcardCount} éléments et que ta fiche de révision est vraiment détaillée et structurée comme un document pédagogique complet.
`;

  // Paramètres pour l'API
  const apiParams = {
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: "Tu es un assistant éducatif expert qui crée des fiches de révision détaillées, structurées et visuelles. Tu utilises abondamment des émojis pour rendre le contenu attractif et tu organises l'information comme un vrai professeur le ferait. Tu suis scrupuleusement les instructions concernant le nombre d'éléments à générer."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 24000,
    response_format: { type: "json_object" }
  };

  try {
    // Tentative avec le modèle principal
    console.log("Tentative de génération avec mistral-large-latest...");
    const response = await axios.post(
      "https://api.mistral.ai/v1/chat/completions",
      apiParams,
      {
        headers: {
          "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Réponse vide ou incorrecte de l'API");
    }

    try {
      const parsedContent = JSON.parse(content);

      // Vérification et complétion des structures
      if (!parsedContent.revision.definitions) parsedContent.revision.definitions = [];
      if (!parsedContent.revision.methodology) parsedContent.revision.methodology = "";
      if (!parsedContent.revision.examples) parsedContent.revision.examples = [];
      if (!parsedContent.revision.practical_applications) parsedContent.revision.practical_applications = "";
      if (!parsedContent.revision.must_know) parsedContent.revision.must_know = [];
      if (!parsedContent.revision.tips) parsedContent.revision.tips = [];
      if (!parsedContent.revision.structure) parsedContent.revision.structure = [];
      if (!parsedContent.revision.conclusion) parsedContent.revision.conclusion = "";
      
      // Ajouter les images du PDF APRÈS la génération du contenu
      if (pdfImages.length > 0) {
        // Ajouter les images à la fiche de révision
        parsedContent.revision.images = pdfImages;
        
        // Ajouter des images à certaines flashcards (max 30% des flashcards)
        const maxFlashcardsWithImages = Math.min(Math.floor(parsedContent.flashcards.length * 0.3), pdfImages.length);
        for (let i = 0; i < maxFlashcardsWithImages; i++) {
          parsedContent.flashcards[i].image = pdfImages[i % pdfImages.length];
        }
        
        // Ajouter une note mentionnant que les images ont été ajoutées automatiquement
        if (!parsedContent.revision.introduction.includes("images ont été ajoutées automatiquement")) {
          parsedContent.revision.introduction = 
            "Note: Des images extraites du document ont été ajoutées automatiquement à cette fiche. \n\n" + 
            parsedContent.revision.introduction;
        }
      }

      console.log(`Nombre de flashcards reçues: ${parsedContent.flashcards?.length || 0}`);

      if (parsedContent.flashcards.length < flashcardCount) {
        console.warn(`Le modèle n'a généré que ${parsedContent.flashcards.length} flashcards au lieu des ${flashcardCount} demandées.`);
        
        // Compléter les flashcards manquantes
        while (parsedContent.flashcards.length < flashcardCount) {
          parsedContent.flashcards.push({
            question: `Question supplémentaire ${parsedContent.flashcards.length + 1}?`,
            answer: "Réponse générée automatiquement pour compléter le nombre requis.",
            image: ""
          });
        }
      }

      return parsedContent;

    } catch (parseError) {
      console.error("Erreur lors du parsing JSON:", parseError);
      return { error: "Format de réponse incorrect", details: parseError.message };
    }

  } catch (error) {
    console.error('Erreur lors de l\'appel API Mistral:',
      error.response ? `Statut: ${error.response.status}, Données: ${JSON.stringify(error.response.data)}` : error.message
    );
    
    // Si l'erreur est liée à la taille du contexte, renvoyer une erreur claire
    if (error.response && 
        error.response.data && 
        (error.response.data.message?.includes("too large for model") || 
         error.response.status === 400)) {
      
      return {
        error: "Le texte source est trop volumineux pour être traité par l'API Mistral. Veuillez réduire la taille du texte ou le diviser en plusieurs parties.",
        details: error.response.data
      };
    }
    
    // Pour toute autre erreur, renvoyer un message d'erreur générique
    return {
      error: "Erreur lors de la génération des notes. Veuillez réessayer.",
      details: error.response ? error.response.data : error.message
    };
  }
}

// Fonction de test
async function testGeneration() {
  const sampleText = "Le HTML (HyperText Markup Language) est le langage de balisage standard pour créer des pages web. CSS (Cascading Style Sheets) est utilisé pour définir le style des pages web. JavaScript est un langage de programmation qui permet d'ajouter de l'interactivité aux sites web.";

  const result = await generateNotes(sampleText, 20, 10);
  console.log(JSON.stringify(result, null, 2));
  console.log(`Nombre de flashcards: ${result.flashcards?.length || 0}`);
  console.log(`Nombre de QCM: ${result.qcm?.length || 0}`);
}

// Décommentez pour tester
// testGeneration();

module.exports = { generateNotes };