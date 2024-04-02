# gives meaningful names to files for both browsers and adds an additional letter part (used for in-between preview versions)
import json
import os

def rename_dist(browser, version):
    source = "dist-"+browser+".zip"
    destination = "WBE_Preview_" + version + "_" + browser[0:1].upper() + browser[1:] +".zip"
    if os.path.isfile(source):
        if os.path.isfile(destination):
            os.remove(destination)
        os.rename(source, destination)

version_save_file = "lastVersion.txt"

with open('src/manifest/manifest-chrome.json') as f:
    version_letter = "a"
    manifest = json.load(f)
    version_number = manifest["version"]
    
    if os.path.isfile (version_save_file ):
        print("version file found")
        with open(version_save_file , "r") as v:
            version_parts = v.readlines();
            print(f"previous version: {version_parts}")
            if version_parts[0] == version_number+ "\n":
                print("same basic version")
                version_letter =  chr(ord(version_parts[1]) + 1)
            else:
                version_letter = "a"
    version_name = version_number+version_letter
    rename_dist("chrome", version_name)
    rename_dist("firefox", version_name)
    with open(version_save_file , "w") as v:
        v.write(f"{version_number}\n{version_letter}")
    
