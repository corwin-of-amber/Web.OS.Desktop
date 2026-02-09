#!/bin/bash -e

# source directories
WASIK=node_modules/wasi-kernel
WASMER_JS=$WASIK/node_modules/@wasmer/sdk/dist
# deploy directory
: ${REMOTE_HOST:=pl}
: ${REMOTE_DIST:='var/workspace/Web.OS.Desktop/dist'}

build() {
    compile
    distro
}

compile() {
    rm -rf dist
    npx kremlin --prod -o dist index.html
    ./collect-assets.sh

    tar cf - $WASMER_JS/{wasmer_js_bg.wasm,index.mjs} $WASIK/bootstrap/src/worker.js $WASIK/bootstrap/build/worker/init.js \
        | (cd dist && tar xf -)
}

distro() {
    npx kremlin --node -o build/kremlin/publish src/collect-wasi.ts
    node build/kremlin/publish/collect-wasi.js
}

deploy() {
    rsync -a --info=progress2 --rsync-path="mkdir -p $REMOTE_DIST && rsync" \
        ./dist/ $REMOTE_HOST:$REMOTE_DIST
}

for arg in "$@"; do
    case "$arg" in
        build) build ;;
        compile) compile ;;
        distro) distro ;;
        deploy) deploy ;;
        *) echo "Unknown argument: $arg" ;;
    esac
done

echo "Done."