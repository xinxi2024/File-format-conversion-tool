// PDF.js 初始化
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 获取DOM元素
const inputDropZone = document.getElementById('inputDropZone');
const fileInput = document.getElementById('fileInput');
const inputFormat = document.getElementById('inputFormat');
const outputFormat = document.getElementById('outputFormat');
const convertBtn = document.getElementById('convertBtn');
const fileInfo = document.querySelector('.file-info');
const fileName = document.querySelector('.file-name');

// 文件格式映射
const formatIcons = {
    'pdf': 'fa-file-pdf',
    'png': 'fa-file-image',
    'md': 'fa-file-lines'
};

// 更新文件输入接受的格式
function updateAcceptedFormats() {
    const format = inputFormat.value;
    switch(format) {
        case 'pdf':
            fileInput.accept = '.pdf';
            break;
        case 'png':
            fileInput.accept = '.png';
            fileInput.multiple = true;
            break;
        case 'md':
            fileInput.accept = '.md,.markdown';
            break;
    }
}

// 更新输出格式选项
function updateOutputFormats() {
    const inputType = inputFormat.value;
    outputFormat.innerHTML = '';
    
    if (inputType === 'pdf') {
        outputFormat.innerHTML = '<option value="png">PNG图片</option>';
    } else if (inputType === 'png') {
        outputFormat.innerHTML = '<option value="pdf">PDF文件</option>';
    } else if (inputType === 'md') {
        outputFormat.innerHTML = `
            <option value="pdf">PDF文件</option>
            <option value="html">HTML文件</option>
        `;
    }
}

// 显示文件信息
function showFileInfo(files) {
    const format = inputFormat.value;
    const fileIcon = formatIcons[format] || 'fa-file';
    
    if (files.length > 1) {
        fileName.textContent = `已选择 ${files.length} 个文件`;
    } else {
        fileName.textContent = files[0].name;
    }
    
    const fileInfoIcon = fileInfo.querySelector('i');
    fileInfoIcon.className = `fas ${fileIcon}`;
    fileInfo.style.display = 'flex';
    
    // 隐藏默认的上传图标和文字
    inputDropZone.querySelector('.fa-cloud-upload-alt').style.display = 'none';
    inputDropZone.querySelector('p').style.display = 'none';
    
    convertBtn.disabled = false;
}

// 验证文件格式
function validateFiles(files) {
    const format = inputFormat.value;
    if (format === 'pdf') {
        return files.length === 1 && files[0].type === 'application/pdf';
    } else if (format === 'png') {
        return Array.from(files).every(file => file.type === 'image/png');
    } else if (format === 'md') {
        return files.length === 1 && 
               (files[0].name.endsWith('.md') || files[0].name.endsWith('.markdown'));
    }
    return false;
}

// 重置上传区域
function resetDropZone() {
    fileInfo.style.display = 'none';
    inputDropZone.querySelector('.fa-cloud-upload-alt').style.display = 'block';
    inputDropZone.querySelector('p').style.display = 'block';
    convertBtn.disabled = true;
    fileInput.value = '';
}

// 拖放区域事件处理
function setupDropZone() {
    inputDropZone.addEventListener('click', () => fileInput.click());
    
    inputDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        inputDropZone.classList.add('drag-over');
    });

    inputDropZone.addEventListener('dragleave', () => {
        inputDropZone.classList.remove('drag-over');
    });

    inputDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        inputDropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        
        if (validateFiles(files)) {
            fileInput.files = files;
            showFileInfo(files);
        } else {
            alert('请选择正确的文件格式！');
        }
    });
}

// 转换功能
async function convertFiles() {
    const files = fileInput.files;
    const inputType = inputFormat.value;
    const outputType = outputFormat.value;
    
    // 禁用转换按钮，防止重复点击
    convertBtn.disabled = true;
    
    try {
        if (inputType === 'pdf' && outputType === 'png') {
            await convertPDFtoPNG(files[0]);
        } else if (inputType === 'png' && outputType === 'pdf') {
            await convertPNGtoPDF(files);
        } else if (inputType === 'md') {
            if (outputType === 'pdf') {
                await convertMarkdownToPDF(files[0]);
            } else if (outputType === 'html') {
                await convertMarkdownToHTML(files[0]);
            }
        }
        resetDropZone();
    } catch (error) {
        console.error('转换出错：', error);
        alert('转换过程中出现错误！');
    } finally {
        // 重新启用转换按钮
        convertBtn.disabled = false;
    }
}

// PDF转PNG（带ZIP打包）
async function convertPDFtoPNG(pdfFile) {
    const zip = new JSZip();
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        const pngData = canvas.toDataURL('image/png').split(',')[1];
        zip.file(`page_${pageNum}.png`, pngData, {base64: true});
    }
    
    const content = await zip.generateAsync({type: 'blob'});
    const url = URL.createObjectURL(content);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'converted_images.zip';
    downloadLink.click();
    URL.revokeObjectURL(url);
    
    alert('转换完成！');
}

// Markdown转HTML
async function convertMarkdownToHTML(mdFile) {
    try {
        const text = await mdFile.text();
        
        // 创建HTML内容
        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${mdFile.name.replace(/\.(md|markdown)$/, '')}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #24292e;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #ffffff;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { font-size: 2em; padding-bottom: .3em; border-bottom: 1px solid #eaecef; }
        h2 { font-size: 1.5em; padding-bottom: .3em; border-bottom: 1px solid #eaecef; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        p, ul, ol { margin-bottom: 16px; }
        code {
            padding: .2em .4em;
            margin: 0;
            font-size: 85%;
            background-color: rgba(27,31,35,.05);
            border-radius: 3px;
            font-family: "SFMono-Regular",Consolas,Monaco,"Liberation Mono","Courier New",monospace;
        }
        pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            background-color: #f6f8fa;
            border-radius: 3px;
        }
        pre code {
            padding: 0;
            background-color: transparent;
        }
        blockquote {
            padding: 0 1em;
            color: #6a737d;
            border-left: .25em solid #dfe2e5;
            margin: 0 0 16px 0;
        }
        table {
            border-spacing: 0;
            border-collapse: collapse;
            margin: 16px 0;
            width: 100%;
        }
        table th, table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
        }
        table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
        img {
            max-width: 100%;
            box-sizing: border-box;
        }
        hr {
            height: .25em;
            padding: 0;
            margin: 24px 0;
            background-color: #e1e4e8;
            border: 0;
        }
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #0d1117;
                color: #c9d1d9;
            }
            a { color: #58a6ff; }
            code { background-color: rgba(240,246,252,0.15); }
            pre { background-color: #161b22; }
            blockquote { color: #8b949e; border-left-color: #30363d; }
            table th, table td { border-color: #30363d; }
            table tr:nth-child(2n) { background-color: #161b22; }
            hr { background-color: #30363d; }
        }
    </style>
</head>
<body>
    ${marked.parse(text, {
        gfm: true,
        breaks: true,
        highlight: function(code, lang) {
            return code;
        }
    })}
</body>
</html>`;

        // 创建并下载HTML文件
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = mdFile.name.replace(/\.(md|markdown)$/, '.html');
        downloadLink.click();
        URL.revokeObjectURL(url);
        
        alert('转换完成！');
    } catch (error) {
        console.error('Markdown转HTML出错：', error);
        alert('转换过程中出现错误！');
    }
}

// Markdown转PDF
async function convertMarkdownToPDF(mdFile) {
    try {
        const text = await mdFile.text();
        
        // 创建一个临时的div来渲染Markdown内容
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '800px';  // 固定宽度
        tempDiv.style.padding = '40px';
        tempDiv.style.background = 'white';
        tempDiv.style.boxSizing = 'border-box';
        
        // 设置Markdown内容和样式
        tempDiv.innerHTML = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    font-size: 16px;
                    line-height: 1.6;
                    color: #24292e;
                }
                h1, h2, h3, h4, h5, h6 {
                    margin-top: 24px;
                    margin-bottom: 16px;
                    font-weight: 600;
                    line-height: 1.25;
                }
                h1 { font-size: 2em; padding-bottom: .3em; border-bottom: 1px solid #eaecef; }
                h2 { font-size: 1.5em; padding-bottom: .3em; border-bottom: 1px solid #eaecef; }
                h3 { font-size: 1.25em; }
                h4 { font-size: 1em; }
                p, ul, ol { margin-bottom: 16px; }
                ul, ol { padding-left: 2em; }
                li { margin: 0.25em 0; }
                code {
                    padding: .2em .4em;
                    margin: 0;
                    font-size: 85%;
                    background-color: rgba(27,31,35,.05);
                    border-radius: 3px;
                    font-family: monospace;
                }
                pre {
                    padding: 16px;
                    overflow: auto;
                    font-size: 85%;
                    line-height: 1.45;
                    background-color: #f6f8fa;
                    border-radius: 3px;
                    margin: 0 0 16px 0;
                }
                pre code {
                    padding: 0;
                    background-color: transparent;
                }
                blockquote {
                    padding: 0 1em;
                    color: #6a737d;
                    border-left: .25em solid #dfe2e5;
                    margin: 0 0 16px 0;
                }
                table {
                    border-spacing: 0;
                    border-collapse: collapse;
                    margin: 16px 0;
                    width: 100%;
                }
                table th, table td {
                    padding: 6px 13px;
                    border: 1px solid #dfe2e5;
                }
                table tr:nth-child(2n) {
                    background-color: #f6f8fa;
                }
                img {
                    max-width: 100%;
                    margin: 8px 0;
                }
            </style>
            <div class="markdown-body">
                ${marked.parse(text, {
                    gfm: true,
                    breaks: true,
                    highlight: function(code, lang) {
                        return code;
                    }
                })}
            </div>
        `;
        
        document.body.appendChild(tempDiv);

        // 等待样式应用
        await new Promise(resolve => setTimeout(resolve, 100));

        // 使用html2canvas渲染
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 800,
            height: tempDiv.scrollHeight
        });

        document.body.removeChild(tempDiv);

        // 创建PDF
        const pdfDoc = await PDFLib.PDFDocument.create();
        const pngImage = await pdfDoc.embedPng(canvas.toDataURL('image/png'));
        
        // 使用A4尺寸
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        
        // 计算缩放比例
        const scale = Math.min(
            (pageWidth - 80) / canvas.width,
            (pageHeight - 80) / canvas.height
        );
        
        const scaledWidth = canvas.width * scale;
        const scaledHeight = canvas.height * scale;
        
        // 创建页面并居中绘制
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(pngImage, {
            x: (pageWidth - scaledWidth) / 2,
            y: pageHeight - scaledHeight - 40,
            width: scaledWidth,
            height: scaledHeight
        });

        // 保存并下载PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = mdFile.name.replace(/\.(md|markdown)$/, '.pdf');
        downloadLink.click();
        
        URL.revokeObjectURL(url);
        alert('转换完成！');
    } catch (error) {
        console.error('Markdown转PDF出错：', error);
        alert('转换过程中出现错误！');
    }
}

// PNG转PDF
async function convertPNGtoPDF(pngFiles) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        for (const file of pngFiles) {
            try {
                // 读取PNG文件
                const arrayBuffer = await file.arrayBuffer();
                const image = await pdfDoc.embedPng(arrayBuffer);
                
                // 创建页面并绘制图片
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            } catch (error) {
                throw new Error(`文件 "${file.name}" 不是有效的PNG图片！`);
            }
        }
        
        // 保存并下载PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'converted.pdf';
        downloadLink.click();
        
        URL.revokeObjectURL(url);
        alert('转换完成！');
    } catch (error) {
        console.error('PNG转PDF出错：', error);
        alert(error.message || '转换过程中出现错误！');
    }
}

// 事件监听
setupDropZone();

inputFormat.addEventListener('change', () => {
    updateAcceptedFormats();
    updateOutputFormats();
    resetDropZone();
});

fileInput.addEventListener('change', (e) => {
    if (validateFiles(e.target.files)) {
        showFileInfo(e.target.files);
    } else {
        alert('请选择正确的文件格式！');
        resetDropZone();
    }
});

convertBtn.addEventListener('click', convertFiles);

// 初始化
updateAcceptedFormats();
updateOutputFormats(); 