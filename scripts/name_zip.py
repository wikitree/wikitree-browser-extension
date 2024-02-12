import json
import os

def rename_dist(browser, version):
    source = "dist-"+browser+".zip"
    destination = "WBE_Preview_" + version + "_" + browser[0:1].upper() + browser[1:] +".zip"
    if os.path.isfile(source):
        if os.path.isfile(destination):
            os.remove(destination)
        os.rename(source, destination)

with open('src/manifest/manifest-chrome.json') as f:
    manifest = json.load(f)
    rename_dist("chrome", manifest["version"])
    rename_dist("firefox", manifest["version"])
    
