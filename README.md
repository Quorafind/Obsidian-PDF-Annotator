# Obsidian PDF Annotator

[中文文档](./README_CN.md)

Simple but powerful PDF annotator for Obsidian.

![screenshot](./media/screenshot.png)

**Stay tuned when Obsidian merge the pdf.js 4.x version, I will support save the annotations into pdf file.**

## Features

- Annotate PDFs in Obsidian;
  - Highlight text;
  - Add comments;
  - Add stamps;
  - Add shapes;
    - Circle;
    - Rectangle;
  - Add signatures;
- Currently, it is not possible to save the highlight annotations to the PDF file itself (So I don't support save it into pdf yet), but the annotations are saved in the Obsidian vault. 
  - Because Obsidian is still using 3.9.0 version of pdf.js, which does not support save highlight annotations to the PDF file itself.
  - And the highlight annotations is supported in 4.x stage of Pdf.js.
  - **All the annotations is follow the pdf.js annotations extension format, so it is possible to save it into pdf file in the future.**

## Installation

### BRAT

[BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewer's Auto-update Tool) is a plugin that allows users to
install Obsidian plugins directly from GitHub with automatic updates.

via Commands:

1. Ensure BRAT is installed
2. Enter the command `BRAT: Plugins: Add a beta plugin for testing`
3. Enter `Quorafind/Obsidian-PDF-Annotator`
4. Click on Add Plugin

via Settings:

1. Ensure BRAT is installed
2. Go to *Settings > BRAT > Beta Plugin List*
3. Click on Add Beta plugin
4. Enter `Quorafind/Obsidian-PDF-Annotator`
5. Click on Add Plugin

### Manual

Option 1:

1. Go to [Releases](https://github.com/Quorafind/Obsidian-PDF-Annotator/releases)
2. Download the latest `Obsidian-PDF-Annotator-${version}.zip`
3. Extract its contents
4. Move the contents into /your-vault/.obsidian/plugins/obsidian-PDF-Annotator/
5. Go to *Settings > Community plugins*
6. Enable PDF Annotator

Option 2:

1. Go to [Releases](https://github.com/Quorafind/Obsidian-PDF-Annotator/releases)
2. Download the latest `main.js`, `styles.css` and `manifest.json`
3. Move the files into /your-vault/.obsidian/plugins/obsidian-PDF-Annotator/
5. Go to *Settings > Community plugins*
6. Enable PDF Annotator


## Credits

- Most features from [pdf.js annotations extension](https://github.com/Laomai-codefee/pdfjs-annotation-extension)
- [pdf.js](https://mozilla.github.io/pdf.js/)
