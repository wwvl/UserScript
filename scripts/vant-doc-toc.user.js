// ==UserScript==
// @name         Vant Doc TOC
// @name:zh-CN   Vant 文档目录导航
// @namespace    https://github.com/wwvl/UserScript
// @version      1.3.0
// @author       wwvl
// @description  Add a floating TOC navigation to Vant documentation
// @description:zh-CN  为 Vant 文档添加悬浮目录导航，支持章节跳转、目录拖拽、滚动同步
// @match        https://vant.pro/vant*
// @downloadURL  https://fastly.jsdelivr.net/gh/wwvl/UserScript@main/scripts/vant-doc-toc.user.js
// @license      Apache-2.0
// @grant        none
// @run-at       document-end
// @supportURL   https://github.com/wwvl/UserScript/issues
// @homepageURL  https://github.com/wwvl/UserScript
// ==/UserScript==

(() => {
    let tocContainer = null;

    // 检查内容是否已加载
    function isContentReady() {
        return document.querySelector('.van-doc-markdown-body')?.querySelector('h1, h2, h3');  // 确保至少有一个标题元素
    }

    // 初始化 TOC
    function initTOC() {
        // 如果内容已经准备好，直接初始化
        if (isContentReady()) {
            generateTOC();
            observeURLChange();
            return;
        }

        // 使用 MutationObserver 监听内容变化
        const observer = new MutationObserver((mutations, obs) => {
            if (isContentReady()) {
                obs.disconnect();
                generateTOC();
                observeURLChange();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 设置超时，但不输出警告
        setTimeout(() => {
            observer.disconnect();
        }, 5000);  // 5 秒超时
    }

    // 监听 URL 变化
    function observeURLChange() {
        let lastURL = location.href;
        const CHECK_INTERVAL = 500;

        setInterval(() => {
            const currentURL = location.href;
            if (currentURL !== lastURL) {
                lastURL = currentURL;
                if (isContentReady()) {
                    generateTOC();
                }
            }
        }, CHECK_INTERVAL);
    }

    // 获取页面路径
    function getPagePath() {
        try {
            const hash = location.hash.slice(1); // 移除开头的 #
            const [basePath] = hash.split('#');  // 获取第二个#前的内容
            return basePath || '';  // 确保返回空字符串而不是 undefined
        } catch (error) {
            console.warn('获取页面路径失败：', error);
            return '';
        }
    }

    function generateTOC() {
        const content = document.querySelector('.van-doc-markdown-body');
        if (!content) return;

        if (!tocContainer) {
            tocContainer = document.createElement('div');
            tocContainer.id = 'custom-toc';

            // 添加滚动条样式
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                #custom-toc div {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
                }
                #custom-toc div::-webkit-scrollbar {
                    width: 4px;
                }
                #custom-toc div::-webkit-scrollbar-track {
                    background: transparent;
                }
                #custom-toc div::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }
            `;
            document.head.appendChild(styleSheet);

            // 合并基础样式
            tocContainer.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 280px;
                max-height: 80vh;
                background: linear-gradient(145deg, rgba(31, 31, 31, 0.66), rgba(41, 41, 41, 0.66));
                border-radius: 8px;
                padding: 0;
                z-index: 1000;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                color: #fff;
                font-family: 'Roboto', Arial, sans-serif;
                display: flex;
                flex-direction: column;
                cursor: grab;
            `;

            document.body.appendChild(tocContainer);
            makeDraggable(tocContainer);
        } else {
            if (tocContainer.cleanup) {
                tocContainer.cleanup();
            }
            tocContainer.innerHTML = '';
        }

        const headers = content.querySelectorAll('h1, h2, h3');
        const firstH1 = headers[0]?.textContent || '目录';

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = `📜 ${firstH1}`;
        title.style.cssText = `
            margin: 0;
            padding: 8px;
            color: #00d4ff;
            text-align: center;
            font-size: 15px;
            font-weight: bold;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background-color: rgba(0, 0, 0, 0.2);
        `;
        tocContainer.appendChild(title);

        // 创建内容包装器
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            overflow-y: auto;
            padding: 8px;
            flex: 1;
        `;

        // 创建列表
        const list = document.createElement('ul');
        list.style.cssText = `
            list-style: none;
            padding: 0;
            margin: 0;
            line-height: 1.1;
        `;

        // 获取当前页面路径
        const basePath = getPagePath();

        // 为同级别的标题准备计数器
        const counters = {
            h1: 0,
            h2: 0,
            h3: 0
        };

        // 添加活跃标题样式
        const styleSheet = document.createElement('style');
        styleSheet.textContent += `
            .toc-link-active {
                background: rgba(0, 212, 255, 0.2) !important;
                border-left: 2px solid #00d4ff !important;
            }
        `;
        document.head.appendChild(styleSheet);

        const links = new Map(); // 存储标题和对应链接的映射
        
        for (const header of headers) {
            const tagName = header.tagName.toLowerCase();
            
            // 跳过 h1 标题
            if (tagName === 'h1') {
                continue;
            }

            const level = Number.parseInt(header.tagName.substring(1));
            
            // 更新计数器
            if (tagName === 'h2') {
                counters.h2++;
                counters.h3 = 0;
            } else if (tagName === 'h3') {
                counters.h3++;
            }

            // 生成序号
            let prefix = '';
            if (tagName === 'h2') {
                prefix = `${counters.h2}. `;
            } else if (tagName === 'h3') {
                prefix = `${counters.h2}.${counters.h3} `;
            }

            const id = header.getAttribute('id') || header.textContent.trim().replace(/\s+/g, '-').toLowerCase();
            if (!header.id) {
                header.id = id;
            }

            const item = document.createElement('li');
            item.style.cssText = `
                margin-left: ${(level - 2) * 12}px;
                margin-bottom: 2px;
            `;

            const link = document.createElement('a');
            link.href = basePath ? `#${basePath}#${id}` : `#${id}`;
            link.textContent = prefix + header.textContent;
            link.style.cssText = `
                text-decoration: none;
                color: #ffffff;
                font-size: 14px;
                padding: 3px 8px;
                display: inline-block;
                border-radius: 5px;
                transition: all 0.3s;
                border-left: 2px solid transparent;
            `;

            // 存储标题和链接的映射关系
            links.set(header, link);

            // Hover 效果
            link.addEventListener('mouseover', () => {
                link.style.background = '#00d4ff';
                link.style.color = '#000';
            });
            link.addEventListener('mouseout', () => {
                link.style.background = 'none';
                link.style.color = '#ffffff';
            });

            item.appendChild(link);
            list.appendChild(item);
        }

        contentWrapper.appendChild(list);
        tocContainer.appendChild(contentWrapper);

        // 创建 Intersection Observer
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5  // 当题元素可见面积超过 50% 时触发
        };

        let currentActiveLink = null;

        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const link = links.get(entry.target);
                if (!link) return;

                if (entry.isIntersecting) {
                    // 除之前的高亮
                    if (currentActiveLink) {
                        currentActiveLink.classList.remove('toc-link-active');
                    }
                    // 添加新的高亮
                    link.classList.add('toc-link-active');
                    currentActiveLink = link;

                    // 确保高亮的链接在视图中可见
                    const wrapper = tocContainer.querySelector('div');
                    const linkRect = link.getBoundingClientRect();
                    const wrapperRect = wrapper.getBoundingClientRect();
                    
                    if (linkRect.top < wrapperRect.top || linkRect.bottom > wrapperRect.bottom) {
                        link.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }, observerOptions);

        // 观察所有标题元素
        links.forEach((link, header) => {
            observer.observe(header);
        });

        // 在 TOC 容器被移除时停止观察
        const cleanup = () => {
            observer.disconnect();
            links.clear();
        };

        // 保存清理函数，以便在下次更新时调用
        tocContainer.cleanup = cleanup;
    }

    // 实现拖拽功能
    function makeDraggable(element) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        element.addEventListener('mousedown', (event) => {
            isDragging = true;
            startX = event.clientX;
            startY = event.clientY;

            const rect = element.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            element.style.cursor = 'grabbing'; // 改变鼠标样式

            // 防止选中文字
            event.preventDefault();
        });

        function onMouseMove(event) {
            if (!isDragging) return;

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            element.style.left = `${startLeft + dx}px`;
            element.style.top = `${startTop + dy}px`;
            element.style.right = 'auto'; // 禁用 right，让元素自由移动
        }

        function onMouseUp() {
            isDragging = false;
            element.style.cursor = 'grab'; // 恢复鼠标样式
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    // 直接初始化
    initTOC();
})();
