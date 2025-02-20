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
        
        // 设置超时检查
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('转换超时，请检查文件是否正确')), 5000);
        });

        // 检查文件类型
        if (!wordFile.name.endsWith('.docx')) {
            throw new Error('目前仅支持 .docx 格式的 Word 文件');
        }

        // 转换过程
        const conversionPromise = (async () => {
            // 读取 Word 文件
            const arrayBuffer = await wordFile.arrayBuffer();
            
            // 转换为 HTML
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            
            // 创建临时 div
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 210mm;
                min-height: 297mm;
                padding: 20mm;
                margin: 0;
                background: white;
                font-family: Arial, sans-serif;
                line-height: 1.5;
                z-index: -9999;
            `;
            
            // 添加内容和样式
            tempDiv.innerHTML = `
                <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; padding: 0; }
                    p { margin: 0 0 10px 0; }
                    img { max-width: 100%; height: auto; }
                </style>
                ${result.value}
            `;
            
            document.body.appendChild(tempDiv);

            // 等待内容渲染
            await new Promise(resolve => setTimeout(resolve, 100));

            // 使用 html2canvas 和 jsPDF
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                scrollY: 0,
                windowWidth: tempDiv.scrollWidth,
                windowHeight: tempDiv.scrollHeight
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            // 从 window.jspdf 获取 jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            // 在保存PDF之前先移除加载提示
            hideLoadingMessage();
            
            // 保存PDF
            pdf.save(wordFile.name.replace('.docx', '.pdf'));

            // 清理
            document.body.removeChild(tempDiv);
        })();

        // 使用 Promise.race 来处理超时
        await Promise.race([conversionPromise, timeoutPromise]);
        
        // 确保加载提示已经移除
        hideLoadingMessage();
        
        // 显示成功提示
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
        }
        code {
            font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
            background-color: rgba(27, 31, 35, 0.05);
            padding: 0.2em 0.4em;
            border-radius: 3px;
        }
        pre code {
            background-color: transparent;
            padding: 0;
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
    </style>
</head>
<body>
    ${html}
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
        // 动态加载 html2pdf
        if (typeof html2pdf === 'undefined') {
            await import('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        }
        
        const text = await mdFile.text();
        
        // 创建一个临时的div来渲染Markdown内容
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '800px';  // 设置固定宽度以便于PDF转换
        
        // 添加基本样式
        tempDiv.style.cssText = `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #24292e;
            padding: 2rem;
            background-color: #ffffff;
        `;
        
        // 添加Markdown内容
        const htmlContent = marked.parse(text, {
            gfm: true,
            breaks: true
        });
        
        // 包装HTML内容，添加样式
        tempDiv.innerHTML = `
            <style>
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
                    font-family: "SFMono-Regular",Consolas,Monaco,monospace;
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
                img {
                    max-width: 100%;
                    box-sizing: border-box;
                }
            </style>
            ${htmlContent}
        `;
        
        document.body.appendChild(tempDiv);

        // 使用html2pdf进行转换
        const opt = {
            margin: [10, 10],
            filename: mdFile.name.replace(/\.(md|markdown)$/, '.pdf'),
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            }
        };

        await html2pdf().set(opt).from(tempDiv).save();
        
        // 清理临时元素
        document.body.removeChild(tempDiv);
        
        alert('转换完成！');
    } catch (error) {
        console.error('Markdown转PDF出错：', error);
        alert('转换过程中出现错误！');
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