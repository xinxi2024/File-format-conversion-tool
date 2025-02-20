// PDF.js 初始化
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// docx.js 初始化
// const { Document, Packer, Paragraph, TextRun } = docx; // 删除这行

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
    fileInput.multiple = false;
    
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
        case 'docx':
            fileInput.accept = '.docx';  // 暂时只支持 .docx
            break;
    }
}

// 更新输出格式选项
function updateOutputFormats() {
    const inputType = inputFormat.value;
    outputFormat.innerHTML = '';
    const pngToPdfOptions = document.getElementById('pngToPdfOptions');
    
    if (inputType === 'pdf') {
        outputFormat.innerHTML = `
            <option value="png">PNG图片</option>
        `;
        pngToPdfOptions.style.display = 'none';
    } else if (inputType === 'png' || inputType === 'docx') {
        outputFormat.innerHTML = '<option value="pdf">PDF文件</option>';
        pngToPdfOptions.style.display = inputType === 'png' ? 'block' : 'none';
    } else if (inputType === 'md') {
        outputFormat.innerHTML = `
            <option value="pdf">PDF文件</option>
            <option value="html">HTML文件</option>
        `;
        pngToPdfOptions.style.display = 'none';
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
    } else if (format === 'docx') {
        return files.length === 1 && files[0].name.endsWith('.docx');  // 暂时只支持 .docx
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
    
    try {
        if (inputType === 'pdf') {
            if (outputType === 'png') {
                await convertPDFtoPNG(files[0]);
            }
        } else if (inputType === 'png' && outputType === 'pdf') {
            await convertPNGtoPDF(files);
        } else if (inputType === 'docx' && outputType === 'pdf') {
            await convertWordToPDF(files[0]);
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
        showErrorMessage('转换过程中出现错误！');
    }
}

// 添加新的 Word 转 PDF 功能
async function convertWordToPDF(wordFile) {
    try {
        showLoadingMessage('正在转换文件，请稍候...');

        // 读取 Word 文件
        const arrayBuffer = await wordFile.arrayBuffer();
        
        // 配置 mammoth 选项
        const options = {
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Title'] => h1.title:fresh",
                "p[style-name='Subtitle'] => h2.subtitle:fresh",
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em"
            ],
            includeDefaultStyleMap: true,
            convertImage: mammoth.images.imgElement(function(image) {
                return image.read("base64").then(function(imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    };
                });
            })
        };

        // 转换为 HTML
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options);
        
        // 创建容器
        const container = document.createElement('div');
        container.className = 'word-container';
        
        // 添加样式和内容
        container.innerHTML = `
            <style>
                .word-container {
                    width: 210mm;
                    padding: 20mm;
                    background: white;
                    font-family: 'Times New Roman', serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    color: #000;
                }
                .word-container h1 {
                    font-size: 24pt;
                    margin: 24pt 0 12pt;
                }
                .word-container h2 {
                    font-size: 18pt;
                    margin: 18pt 0 9pt;
                }
                .word-container h3 {
                    font-size: 14pt;
                    margin: 14pt 0 7pt;
                }
                .word-container p {
                    margin: 12pt 0;
                    text-align: justify;
                }
                .word-container table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 12pt 0;
                }
                .word-container th,
                .word-container td {
                    border: 1px solid #000;
                    padding: 8pt;
                }
                .word-container img {
                    max-width: 100%;
                    height: auto;
                    margin: 12pt 0;
                }
                .word-container ul,
                .word-container ol {
                    margin: 12pt 0;
                    padding-left: 24pt;
                }
                .word-container li {
                    margin: 6pt 0;
                }
                .word-container blockquote {
                    margin: 12pt 24pt;
                    padding-left: 12pt;
                    border-left: 3pt solid #000;
                    font-style: italic;
                }
                @page {
                    margin: 0;
                }
            </style>
            ${result.value}
        `;

        document.body.appendChild(container);

        // 等待内容渲染
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 配置 PDF 选项
        const opt = {
            margin: 0,
            filename: wordFile.name.replace('.docx', '.pdf'),
            image: { type: 'jpeg', quality: 1 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                scrollX: 0,
                scrollY: 0,
                letterRendering: true,
                onclone: function(clonedDoc) {
                    const container = clonedDoc.querySelector('.word-container');
                    if (container) {
                        container.style.transform = 'none';
                    }
                }
            },
            jsPDF: {
                unit: 'pt',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        // 转换为 PDF
        await html2pdf().from(container).set(opt).save();

        // 清理
        document.body.removeChild(container);
        
        hideLoadingMessage();
        showSuccessMessage('转换完成！');
    } catch (error) {
        console.error('Word转PDF出错：', error);
        hideLoadingMessage();
        showErrorMessage(error.message || '转换过程中出现错误！');
    }
}

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

// 添加回 Markdown 转 HTML 的功能
async function convertMarkdownToHTML(mdFile) {
    try {
        console.log('开始转换 Markdown 到 HTML:', mdFile);
        showLoadingMessage('正在转换文件，请稍候...');
        
        if (typeof marked === 'undefined') {
            throw new Error('marked 库未正确加载');
        }

        // 配置 marked 使用 highlight.js
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            }
        });

        const text = await mdFile.text();
        console.log('Markdown 内容:', text.substring(0, 100) + '...');
        const html = marked.parse(text);
        
        const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${mdFile.name.replace('.md', '')}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #24292e;
        }
        pre {
            background-color: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow: auto;
            margin: 1em 0;
        }
        code {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
            padding: 0.2em 0.4em;
            border-radius: 3px;
        }
        pre code {
            padding: 0;
            font-size: 100%;
            background: transparent;
        }
        blockquote {
            margin: 0;
            padding-left: 1em;
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #dfe2e5;
            padding: 6px 13px;
        }
        th {
            background-color: #f6f8fa;
        }
        .hljs {
            background: #f6f8fa !important;
            padding: 0 !important;
        }
    </style>
</head>
<body>
    ${html}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    <script>
        // 初始化代码高亮
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    </script>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = mdFile.name.replace('.md', '.html');
        
        hideLoadingMessage();
        downloadLink.click();
        URL.revokeObjectURL(url);
        
        showSuccessMessage('转换完成！');
    } catch (error) {
        console.error('Markdown转HTML出错：', error);
        hideLoadingMessage();
        showErrorMessage('转换过程中出现错误！');
    }
}

// Markdown转PDF
async function convertMarkdownToPDF(mdFile) {
    try {
        showLoadingMessage('正在转换文件，请稍候...');

        const text = await mdFile.text();
        
        // 配置 marked
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });

        // 转换为 HTML
        const html = marked.parse(text);

        // 创建临时容器
        const container = document.createElement('div');
        container.className = 'markdown-container';
        container.innerHTML = html;
        document.body.appendChild(container);

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .markdown-container {
                width: 210mm;
                padding: 20mm;
                background: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #24292e;
            }
            .markdown-container h1,
            .markdown-container h2,
            .markdown-container h3,
            .markdown-container h4,
            .markdown-container h5,
            .markdown-container h6 {
                margin-top: 24px;
                margin-bottom: 16px;
                font-weight: 600;
                line-height: 1.25;
            }
            .markdown-container h1 { font-size: 2em; }
            .markdown-container h2 { font-size: 1.5em; }
            .markdown-container h3 { font-size: 1.25em; }
            .markdown-container p { margin: 1em 0; }
            .markdown-container pre {
                background-color: #f6f8fa;
                padding: 16px;
                border-radius: 6px;
                overflow: auto;
                margin: 1em 0;
                font-size: 85%;
            }
            .markdown-container code {
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 85%;
                background-color: #f6f8fa;
                padding: 0.2em 0.4em;
                border-radius: 3px;
            }
            .markdown-container pre code {
                padding: 0;
                font-size: 100%;
                background: transparent;
            }
            .markdown-container blockquote {
                margin: 1em 0;
                padding-left: 1em;
                color: #6a737d;
                border-left: 0.25em solid #dfe2e5;
            }
            .markdown-container ul,
            .markdown-container ol {
                margin: 1em 0;
                padding-left: 2em;
            }
            .markdown-container table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
            }
            .markdown-container th,
            .markdown-container td {
                border: 1px solid #dfe2e5;
                padding: 6px 13px;
            }
            .markdown-container th {
                background-color: #f6f8fa;
            }
            .markdown-container img {
                max-width: 100%;
                height: auto;
            }
            .hljs {
                background: #f6f8fa !important;
                padding: 0 !important;
            }
        `;
        document.head.appendChild(style);

        // 等待样式应用和内容渲染
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 配置 PDF 选项
        const opt = {
            margin: 0,
            filename: mdFile.name.replace('.md', '.pdf'),
            image: { type: 'jpeg', quality: 1 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        // 转换为 PDF
        await html2pdf().from(container).set(opt).save();

        // 清理
        document.body.removeChild(container);
        document.head.removeChild(style);
        
        hideLoadingMessage();
        showSuccessMessage('转换完成！');
    } catch (error) {
        console.error('Markdown转PDF出错：', error);
        hideLoadingMessage();
        showErrorMessage(error.message || '转换过程中出现错误！');
    }
}

// PNG转PDF
async function convertPNGtoPDF(files) {
    try {
        // 动态加载 jsPDF
        if (typeof window.jspdf === 'undefined') {
            await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        
        const { jsPDF } = window.jspdf;
        const pdfFormat = document.getElementById('pdfPageFormat').value;
        let pdf;
        let isFirstPage = true;

        for (const file of files) {
            // 将文件转换为 base64
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            // 创建图片对象并等待加载
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    if (pdfFormat === 'auto') {
                        // 如果是自适应模式，为每个图片创建合适大小的页面
                        if (!isFirstPage) {
                            pdf.addPage([img.width, img.height]);
                        } else {
                            // 第一页需要创建新的PDF实例
                            pdf = new jsPDF({
                                orientation: img.width > img.height ? 'landscape' : 'portrait',
                                unit: 'px',
                                format: [img.width, img.height]
                            });
                            isFirstPage = false;
                        }
                        // 直接以原始大小添加图片
                        pdf.addImage(base64, 'PNG', 0, 0, img.width, img.height);
                    } else {
                        // A4模式
                        if (isFirstPage) {
                            // 第一页创建PDF实例
                            pdf = new jsPDF();
                            isFirstPage = false;
                        } else {
                            pdf.addPage();
                        }
                        
                        // 计算图片在 A4 页面中的尺寸
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        
                        // 计算缩放比例，使图片适应页面宽度
                        const ratio = pageWidth / img.width;
                        const width = img.width * ratio;
                        const height = img.height * ratio;

                        // 在页面中居中显示图片
                        const x = 0;
                        const y = (pageHeight - height) / 2;
                        
                        // 添加图片到 PDF
                        pdf.addImage(base64, 'PNG', x, y, width, height);
                    }
                    resolve();
                };
                img.src = base64;
            });
        }

        // 保存 PDF
        pdf.save('converted_images.pdf');
        alert('转换完成！');
    } catch (error) {
        console.error('PNG转PDF出错：', error);
        alert('转换过程中出现错误！');
    }
}

// 文件输入事件处理
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (validateFiles(files)) {
        showFileInfo(files);
    } else {
        alert('请选择正确的文件格式！');
        resetDropZone();
    }
});

// 输入格式改变时更新
inputFormat.addEventListener('change', () => {
    updateAcceptedFormats();
    updateOutputFormats();
    resetDropZone();
});

// 转换按钮点击事件
convertBtn.addEventListener('click', convertFiles);

// 初始化设置
document.addEventListener('DOMContentLoaded', () => {
    // 初始化拖放区域
    setupDropZone();
    // 初始化接受的文件格式
    updateAcceptedFormats();
    // 初始化输出格式选项
    updateOutputFormats();
    // 初始化转换按钮状态
    convertBtn.disabled = true;
});

// 修改加载提示函数，添加动画
function showLoadingMessage(message) {
    // 先移除可能存在的其他提示
    hideAllMessages();
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingMessage';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
    `;
    loadingDiv.innerHTML = `
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .loading-spinner {
                animation: spin 1s linear infinite;
            }
        </style>
        <i class="fas fa-spinner fa-spin loading-spinner"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(loadingDiv);
}

function hideAllMessages() {
    const messageIds = ['loadingMessage', 'successMessage', 'errorMessage'];
    messageIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.parentNode.removeChild(element);
        }
    });
}

function hideLoadingMessage() {
    const loadingDiv = document.getElementById('loadingMessage');
    if (loadingDiv) {
        loadingDiv.parentNode.removeChild(loadingDiv);
    }
}

// 添加成功和错误提示函数
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.id = 'successMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(40, 167, 69, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
    `;
    messageDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(messageDiv);
    
    // 2秒后自动移除成功提示
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 2000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.id = 'errorMessage';
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(220, 53, 69, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
    `;
    messageDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除错误提示
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}