# svgo-test  
svgoの各設定確認  
  
## セットアップ  
1. [Docker Desktop](https://www.docker.com/ja-jp/products/docker-desktop/) をインストールする
2. Docker Desktop を起動して、 git clone したディレクトリでターミナルを開き、 `docker compose run --rm node /bin/sh` でコンテナを起動する
3. `npm i` で、npm スクリプトをインストールする  
4. `npm run imagemin` で、画像コンパイルを実行する  
5. `exit` で コンテナを終了する
