const { convert } = require('pdf-poppler');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

async function getImagesFromPdf(pdfPath) {
    try {
        // Vérifier que le PDF existe
        if (!await fs.exists(pdfPath)) {
            console.error(`Le fichier PDF n'existe pas: ${pdfPath}`);
            return [];
        }
        
        // Créer un répertoire dédié aux images pour ce PDF spécifique
        const uniqueId = uuidv4().slice(0, 8);
        const outputDir = path.join(__dirname, 'uploads', 'pdf_images', uniqueId);
        
        console.log('Chemin de sortie des images:', outputDir);
        console.log('Chemin PDF source:', pdfPath);
        
        // Créer le répertoire s'il n'existe pas
        await fs.ensureDir(outputDir);
        
        // Configurer les options de conversion
        const opts = {
            format: 'jpeg',            // Format d'image souhaité
            out_dir: outputDir,        // Répertoire de sortie pour les images
            out_prefix: 'img_',        // Préfixe pour les images extraites
            page: null,                // Toutes les pages
            scale: 1.5,                // Échelle de résolution
            density: 150,              // DPI
            max_pages: 15              // Limiter le nombre de pages à convertir
        };

        // Convertir le PDF en images
        await convert(pdfPath, opts);

        // Vérifier si les images ont été créées
        try {
            const files = await fs.readdir(outputDir);
            console.log(`Nombre de fichiers trouvés dans ${outputDir}: ${files.length}`);
            
            // Filtrer pour ne garder que les images JPEG
            const imageFiles = files
                .filter(f => f.startsWith(opts.out_prefix) && f.endsWith('.jpg'))
                .sort((a, b) => {
                    // Trier les images par numéro de page
                    const pageA = parseInt(a.match(/\d+/)?.[0] || 0);
                    const pageB = parseInt(b.match(/\d+/)?.[0] || 0);
                    return pageA - pageB;
                });

            console.log(`Nombre d'images filtrées: ${imageFiles.length}`);

            // Limiter le nombre d'images
            const MAX_IMAGES = 15;
            const limitedImageFiles = imageFiles.slice(0, MAX_IMAGES);
            
            // Construire les URLs d'images - utiliser le chemin absolu pour l'URL
            const imageUrls = [];
            for (const file of limitedImageFiles) {
                // Construire une URL qui sera correctement servie par Express
                const imageUrl = `/uploads/pdf_images/${uniqueId}/${file}`;
                
                try {
                    // Vérifier que l'image existe et n'est pas vide
                    const fullPath = path.join(outputDir, file);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.size > 0) {
                        imageUrls.push(imageUrl);
                        console.log(`Image ajoutée: ${file}, taille: ${stat.size} octets, URL: ${imageUrl}`);
                        
                        // Copier l'image dans le dossier public pour s'assurer qu'elle est accessible
                        const publicDir = path.join(__dirname, 'public', 'uploads', 'pdf_images', uniqueId);
                        await fs.ensureDir(publicDir);
                        await fs.copy(fullPath, path.join(publicDir, file));
                    } else {
                        console.warn(`Image ignorée car vide: ${file}`);
                    }
                } catch (err) {
                    console.error(`Erreur lors de la vérification de l'image ${file}:`, err);
                }
            }
            
            return imageUrls;
        } catch (readErr) {
            console.error("Erreur lors de la lecture des images:", readErr);
            return [];
        }
    } catch (err) {
        console.error("Erreur lors de l'extraction des images:", err);
        return [];
    }
}

module.exports = { getImagesFromPdf };
