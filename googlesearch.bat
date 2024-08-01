@echo off
chcp 65001 >nul
set /p searchTerm=默认查询15页，请输入搜索关键词: 
start "" cmd /k node google.js "%searchTerm%"
