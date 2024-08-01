@echo off
chcp 65001 >nul
#set /p searchTerm=请输入搜索关键词: 
start "" cmd /k node google.js "信息收集文章"
