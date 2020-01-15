parcel build -d public src/index.html
cp -LR dist/bin public/
cp -r dist/{icons,themes} public/
