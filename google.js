const puppeteer = require('puppeteer');

// 获取电脑的分辨率
const getScreenResolution = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--window-size=1920,1080']
  });
  const page = await browser.newPage();
  
  const resolution = await page.evaluate(() => ({
    width: window.screen.availWidth,
    height: window.screen.availHeight
  }));

  await browser.close();
  return resolution;
};

// 滚动页面并确保内容完全加载
const scrollPage = async (page) => {
  await page.evaluate(async () => {
    const scrollAmount = 70; // 每次滚动的像素值，减小滚动幅度
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // 模拟向下滚动
    while (true) {
      window.scrollBy(0, scrollAmount);
      await delay(2000); // 增加等待时间以放慢滚动速度
      
      // 如果页面底部已经达到了，就停止滚动
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight) break;
    }
  });
};

// 鼠标双击以聚焦当前页面
const focusPage = async (page) => {
  await page.evaluate(async () => {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // 鼠标双击页面的中心点
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const mouseEvent = (type, x, y) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
      document.dispatchEvent(event);
    };

    mouseEvent('mousedown', centerX, centerY);
    await delay(100);
    mouseEvent('mouseup', centerX, centerY);
    await delay(100);
    mouseEvent('mousedown', centerX, centerY);
    await delay(100);
    mouseEvent('mouseup', centerX, centerY);
  });
};

(async () => {
  // 获取屏幕分辨率
  const { width, height } = await getScreenResolution();
  console.log(`Screen resolution: ${width}x${height}`);

  // 设置 Puppeteer 的浏览器窗口大小
  const browser = await puppeteer.launch({
    headless: false,
    args: [`--window-size=${width},${height}`],
    defaultViewport: { width: width, height: height }
  });

  // 打开Google搜索结果页面
  const page = await browser.newPage();
  const searchTerm = process.argv[2] || '默认关键词';
  const encodedSearchTerm = encodeURIComponent(searchTerm);
  const searchUrl = `https://www.google.com/search?q=${encodedSearchTerm}`;
  
  await page.goto(searchUrl);
  
  // 等待页面加载并选择多个搜索结果链接
  await page.waitForSelector('.yuRUbf a');
  
  // 获取搜索结果链接
  const links = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('.yuRUbf a'));
    return elements
      .map(el => el.href)
      .filter(href => href.includes('http'))
      .slice(0, 10);
  });

  console.log(`Found ${links.length} links`);

  // 创建标签页数组，并同时打开所有链接
  const pages = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  // 打开每个链接的标签页，并将它们的 Promise 存储在数组中
  const openPagesPromises = links.map(async (link) => {
    try {
      const newPage = await browser.newPage();
      pages.push(newPage);

      console.log(`Opening: ${link}`);
      await newPage.goto(link, { waitUntil: 'networkidle2' });

      // 确保页面的内容完全加载
      await newPage.waitForFunction(() => document.readyState === 'complete');

      // 聚焦页面并模拟双击
      await focusPage(newPage);

      // 滚动页面以确保内容加载
      await scrollPage(newPage);

      // 动态调整视口大小以适应页面内容
      const { height } = await newPage.evaluate(() => ({
        height: document.documentElement.scrollHeight || document.body.scrollHeight
      }));
      await newPage.setViewport({ width: width, height: height });

      // 等待13分钟（780,000毫秒）以查看文章内容
      await delay(780000);
    } catch (error) {
      console.error(`Failed to open ${link}:`, error);
    }
  });

  // 等待所有标签页都打开并处理完成
  await Promise.all(openPagesPromises);

  // 30分钟后关闭所有标签页和浏览器
  setTimeout(async () => {
    console.log('Closing all tabs and browser...');
    for (const p of pages) {
      try {
        await p.close();
      } catch (error) {
        console.error('Failed to close page:', error);
      }
    }
    await browser.close();
  }, 1800000); // 30分钟（1,800,000毫秒）

})();
