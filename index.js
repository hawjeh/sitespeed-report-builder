const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
// const puppeteer = require('puppeteer');
require('dotenv').config();

const projectName = process.env.PROJECT_NAME;
const sitePath = process.env.SITE_PATH;
const filePath = process.env.FILE_PATH;
const outputPath = process.env.OUTPUT_PATH;
const outputName = process.env.OUTPUT_NAME;

// Func - Find latest folder
async function findLatestFolder(directory) {
    try {
        const folders = await fsPromises.readdir(directory, { withFileTypes: true });

        let latestFolder = null;
        let latestMtimeMs = 0;

        // Iterate over folders and find the latest modified folder
        for (const dirent of folders) {
            if (dirent.isDirectory()) {
                const folderPath = path.join(directory, dirent.name);
                const stats = await fsPromises.stat(folderPath);

                if (stats.mtimeMs > latestMtimeMs) {
                    latestMtimeMs = stats.mtimeMs;
                    latestFolder = { name: dirent.name, mtimeMs: stats.mtimeMs };
                }
            }
        }

        if (!latestFolder) {
            console.log('No folders found.');
        }

        return `${directory}\\${latestFolder.name}`;
    } catch (err) {
        console.error('Error:', err);
    }
}

// Func - 
function buildFile(sourcePath) {
    const pageContent = fs.readFileSync(sourcePath + `\\pages.html`, 'utf-8');
    const cssContent = fs.readFileSync(sourcePath + `\\css\\index.min.css`, 'utf-8');
    const sustainableWebContent = fs.readFileSync(sourcePath + `\\pages\\${sitePath}\\index.html`, 'utf-8');

    const $pageContent = cheerio.load(pageContent);
    const $sustainableWebContent = cheerio.load(sustainableWebContent);

    const wrapper = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Run For [PROJECT_NAME]</title><style>[STYLE]</style></head><body><div class="container">[CONTENT]</div></body></html>`.replace('[PROJECT_NAME]', projectName).replace('[STYLE]', cssContent);
    let mainContent = '';

    $pageContent('.row').each((i, element) => {
        let tempContent = $pageContent(element).parent().html();
        tempContent = tempContent.replace(/<h2 class="url">.*?<\/h2>/s, `<h2 class="url">Analysed for ${projectName}</h2>`);
        tempContent = tempContent.replace(/<p class="small">.*?<\/p>/s, '');
        tempContent = tempContent.replace(/<footer>.*?<\/footer>/s, '');
        mainContent += tempContent;
    });

    $sustainableWebContent('#sustainable-panel').each((i, element) => {
        let tempContent = `<section id="sustainable-panel">${$sustainableWebContent(element).html()}</section>`;
        mainContent += tempContent;
    });

    const htmlContent = wrapper.replace('[CONTENT]', mainContent);

    // Func - Create directory
    function createDirectoryIfNotExists(directory) {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
    }

    // Func - Create File
    function createFile(path, content) {
        fs.writeFile(path, content, 'utf-8', (err) => {
            if (err) {
                console.error('Error writing to file:', err);
            } else {
                console.log('Content successfully written to', path);
            }
        });
    }

    createDirectoryIfNotExists(outputPath);

    // Write file
    const monthYear = `${(new Date()).getMonth() + 1}${(new Date()).getFullYear()}`;
    const indexOutputFile = path.join(outputPath, `${outputName}_${monthYear}.html`);
    createFile(indexOutputFile, htmlContent);

    // code to save pdf
    // const indexPdfOutputFile = indexOutputFile.replace('.html', '.pdf');
    // generatePdfFromHtml(htmlContent, indexPdfOutputFile)
    //     .then(() => console.log('PDF generated successfully'))
    //     .catch(error => console.error('Error:', error));
}

// code to save pdf
// async function generatePdfFromHtml(htmlContent, outputPath) {
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();

//     // Set content of the page
//     await page.setContent(htmlContent);

//     // Generate PDF
//     await page.pdf({ path: outputPath, format: 'A4' });

//     await browser.close();
// }

findLatestFolder(filePath).then((result) => {
    buildFile(result);
});
