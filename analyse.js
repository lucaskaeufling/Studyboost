// Créez ce fichier pour vérifier comment les flashcards sont affichées dans votre interface

const fs = require('fs');

// Fonction pour examiner les données de flashcards
function examineFlashcards(data) {
  console.log('--- ANALYSE DES DONNÉES DE FLASHCARDS ---');
  
  // 1. Vérifier si la propriété flashcards existe
  if (!data.flashcards) {
    console.error('ERREUR: Pas de propriété "flashcards" dans les données');
    return;
  }
  
  // 2. Vérifier le nombre de flashcards
  console.log(`Nombre total de flashcards dans l'objet: ${data.flashcards.length}`);
  
  // 3. Vérifier la structure des données
  console.log('\nStructure de l\'objet:');
  console.log(Object.keys(data));
  
  // 4. Examiner les 3 premières flashcards
  console.log('\nTrois premières flashcards:');
  for (let i = 0; i < Math.min(3, data.flashcards.length); i++) {
    console.log(`\nFlashcard #${i+1}:`);
    console.log(`Question: ${data.flashcards[i].question}`);
    console.log(`Réponse: ${data.flashcards[i].answer}`);
  }
  
  // 5. Vérifier s'il y a des flashcards après la 5ème
  if (data.flashcards.length > 5) {
    console.log('\nPreuve de l\'existence de flashcards après la 5ème:');
    for (let i = 5; i < Math.min(8, data.flashcards.length); i++) {
      console.log(`\nFlashcard #${i+1}:`);
      console.log(`Question: ${data.flashcards[i].question}`);
      console.log(`Réponse: ${data.flashcards[i].answer}`);
    }
  }
}

// Fonction pour trouver où se produirait la troncature
function findTruncationPoint() {
  try {
    // Charger les données supposées complètes (si elles ont été sauvegardées par le script de débogage)
    const dataFromAPI = require('./mistral_content_parsed.json');
    
    console.log('\n--- ANALYSE DE TRONCATURE POTENTIELLE ---');
    console.log(`Nombre de flashcards dans les données brutes: ${dataFromAPI.flashcards?.length || 0}`);
    
    // Simuler différentes étapes de traitement pour trouver où les flashcards pourraient être perdues
    const serialized = JSON.stringify(dataFromAPI);
    const reparsed = JSON.parse(serialized);
    console.log(`Après re-parsing: ${reparsed.flashcards?.length || 0} flashcards`);
    
    // Vérifier si la troncature pourrait se produire dans votre code d'affichage
    console.log('\nÉléments importants à vérifier dans votre code d\'affichage:');
    console.log('1. Limitez-vous explicitement le nombre de flashcards affichées avec .slice() ou .limit ?');
    console.log('2. Utilisez-vous une boucle qui pourrait terminer prématurément?');
    console.log('3. Y a-t-il une condition qui filtre certaines flashcards?');
  } catch (e) {
    console.log('Impossible de charger les données sauvegardées:', e);
  }
}

// Fonction principale
function main() {
  // Testez avec des données fictives si nécessaire
  const sampleData = {
    flashcards: Array.from({ length: 20 }, (_, i) => ({
      question: `Question de test ${i+1}?`,
      answer: `Réponse de test ${i+1}`
    })),
    qcm: [],
    revision: { title: "Test", summary: "Test", key_points: [] }
  };
  
  console.log('=== TEST AVEC DONNÉES FICTIVES ===');
  examineFlashcards(sampleData);
  
  // Si vous avez généré un fichier de sortie, vérifiez-le aussi
  try {
    const savedData = require('./mistral_content_parsed.json');
    console.log('\n\n=== TEST AVEC DONNÉES RÉELLES ===');
    examineFlashcards(savedData);
  } catch (e) {
    console.log('\nAucun fichier de données réelles trouvé');
  }
  
  // Vérifier s'il y a une troncature quelque part
  findTruncationPoint();
  
  console.log('\n--- RECOMMANDATIONS ---');
  console.log('1. Vérifiez dans votre code d\'affichage s\'il y a une limite explicite (slice, limit, etc.)');
  console.log('2. Vérifiez comment vous itérez sur les flashcards');
  console.log('3. Examinez le code qui affiche les flashcards dans votre interface');
}

main();