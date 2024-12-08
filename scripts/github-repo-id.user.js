// ==UserScript==
// @name         GitHub Repository ID Display
// @name:zh-CN   GitHub 仓库 ID 显示
// @namespace    https://github.com/wwvl/UserScript
// @version      1.0.1
// @author       wwvl
// @description  Display repository ID on GitHub repository pages
// @description:zh-CN  在 GitHub 仓库页面显示仓库 ID
// @match        https://github.com/*
// @downloadURL  https://fastly.jsdelivr.net/gh/wwvl/UserScript@main/scripts/github-repo-id.user.js
// @license      MIT
// @grant        none
// @run-at       document-end
// @supportURL   https://github.com/wwvl/UserScript/issues
// @homepageURL  https://github.com/wwvl/UserScript
// ==/UserScript==

(() => {
    const SELECTORS = {
        META_TAG: 'meta[name="hovercard-subject-tag"]',
        TITLE_COMPONENT: '#repo-title-component',
        ID_LABEL: '.repo-id-label'
    };

    const LABEL_CLASS = 'Label Label--secondary v-align-middle mr-1 d-none d-md-block repo-id-label';
    const LOG_PREFIX = 'GitHub Repo ID:';

    const showRepoId = () => {
        // 获取必要的 DOM 元素
        const metaTag = document.querySelector(SELECTORS.META_TAG);
        const titleComponent = document.querySelector(SELECTORS.TITLE_COMPONENT);
        
        // 检查必要元素是否存在
        if (!metaTag || !titleComponent) {
            console.warn(LOG_PREFIX, !metaTag ? 'Meta tag not found' : 'Title component not found');
            return;
        }
        
        // 提取仓库 ID
        const repoId = metaTag.getAttribute('content')?.split(':')[1];
        if (!repoId) {
            console.warn(LOG_PREFIX, 'Failed to extract repository ID from meta tag');
            return;
        }

        // 检查标签是否已存在
        if (titleComponent.querySelector(SELECTORS.ID_LABEL)) {
            console.warn(LOG_PREFIX, 'Label already exists');
            return;
        }

        // 创建并添加标签
        const idLabel = document.createElement('span');
        idLabel.className = LABEL_CLASS;
        idLabel.textContent = repoId;
        titleComponent.appendChild(idLabel);
    };

    // 初始化
    showRepoId();
})(); 