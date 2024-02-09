import json
import os

version = ""
with open('src/manifest/manifest-chrome.json') as f:
    d = json.load(f)
    version = d["version"]

firefox = "WBE_Preview_" + version + "_Firefox.zip"
chrome = "WBE_Preview_" + version + "_Chrome.zip"

if os.path.isfile(firefox):
    os.remove(firefox)

if os.path.isfile(chrome):
    os.remove(chrome)

if os.path.isfile("dist-firefox.zip"):
    os.rename("dist-firefox.zip", firefox)

if os.path.isfile("dist-chrome.zip"):
    os.rename("dist-chrome.zip", chrome)