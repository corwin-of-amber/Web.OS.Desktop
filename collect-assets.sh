#!/bin/bash -e
echo '->' ${D:=dist}

mkdir -p D$/icons D$/themes
cp -r node_modules/@osjs/gnome-icons/dist/ $D/icons/GnomeIcons
cp -r node_modules/@osjs/standard-theme/dist/ $D/themes/StandardTheme

# Link apps
rm -rf $D/apps ; mkdir $D/apps
ln -fs ../../../node_modules/@osjs/filemanager-application/dist $D/apps/FileManager

# Create the manifest
node -p 'JSON.stringify([
           require("@osjs/standard-theme/metadata.json"), 
           require("@osjs/gnome-icons/metadata.json"),
           require("@osjs/filemanager-application/metadata.json"),
           require("./src/apps/xterm-app/metadata.json"),
         ])' > $D/metadata.json
