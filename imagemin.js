const keepfolder = require('imagemin-keep-folder');
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');
const fs = require('fs');

(async () => {
  const imageminSvgo = (await import('imagemin-svgo')).default;

  // Imageminで最初の圧縮・最適化
  await keepfolder(['src/**/*.svg'], {
    plugins: [
      imageminSvgo({
        // コード整形用プラグイン
        // js2svg: {
        //   indent: 2,
        //   pretty: true,
        //   closeSelfClosingTag: true, // 自己閉じタグを保持する
        // },
        plugins: [
          'removeDimensions', // 幅と高さを削除し、viewBox のみで制御
          'removeXMLProcInst', // XML宣言を削除
          'removeComments', // コメントを削除
          'removeMetadata', // <metadata> タグを削除
          'removeUselessDefs', // <defs> タグ内で使われていないものを削除
          'collapseGroups', // グループ要素を一つにまとめる
          'convertStyleToAttrs', // インラインのスタイルを対応するSVG属性に変換
          'sortAttrs', // 属性をソート
          'convertShapeToPath', // 図形を <path> タグに変換
          'convertColors', // 色の表現方法を最も短い形式に変換
          'convertPathData', // パスデータの圧縮
          {
            name: "removeAttrs", // 不要な属性を削除
            params: {
              attrs: 'svg:fill:none' // <svg> タグの fill="none" を削除
            }
          },
          {
            name: "inlineStyles", // <style> タグ内のスタイルをインライン化
            params: {
              onlyMatchedOnce: true,
              removeMatchedSelectors: true
            }
          },
          {
            name: "cleanupIds", // 未使用IDを削除し、短くする
            params: {
              remove: true,
              minify: true,
              preserve: [],
              preservePrefixes: [],
              force: false
            }
          },
          {
            name: "addAttributesToSVGElement", // <svg> タグに属性を追加
            params: {
              attributes: [
                {
                  'aria-hidden': 'true',
                  'data-test': 'test'
                }
              ]
            }
          },
        ]
      })
    ],
    replaceOutputDir: output => {
      return output.replace(/src\//, 'dist/')
    }
  });

  // 再帰的にディレクトリ内のすべてのSVGファイルを取得
  function getAllSvgFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllSvgFiles(filePath));
      } else if (filePath.endsWith('.svg')) {
        results.push(filePath);
      }
    });
    return results;
  }

  const svgFiles = getAllSvgFiles('dist');

  // 圧縮・最適化が完了した後にプレフィックス処理を実行
  svgFiles.forEach(file => {
    const svgContent = fs.readFileSync(file, 'utf-8');
    const dom = new JSDOM(svgContent, { contentType: 'application/xml' });
    const document = dom.window.document;

    // ID名に一意のプレフィックスを追加
    const elementsWithId = document.querySelectorAll('[id]');
    elementsWithId.forEach((element) => {
      const id = element.getAttribute('id');
      if (id) {
        const prefix = crypto.createHash('md5').update(file).digest('hex').slice(0, 8);
        const newId = `${prefix}-${id}`;
        element.setAttribute('id', newId);

        // 参照している属性も更新
        const references = document.querySelectorAll(`[href="#${id}"], [xlink\:href="#${id}"], [clip-path="url(#${id})"], [fill="url(#${id})"], [filter="url(#${id})"]`);
        references.forEach(ref => {
          const attr = [...ref.attributes].find(attr => attr.value === `url(#${id})`);
          if (attr) {
            const attrName = attr.name;
            ref.setAttribute(attrName, `url(#${newId})`);
          }
        });
      }
    });

    // class名に一意のプレフィックスを追加
    const elementsWithClass = document.querySelectorAll('[class]');
    elementsWithClass.forEach((element) => {
      const classNames = element.getAttribute('class');
      if (classNames) {
        const prefix = crypto.createHash('md5').update(file).digest('hex').slice(0, 8);
        const newClassNames = classNames.split(' ').map(className => `${prefix}-${className}`).join(' ');
        element.setAttribute('class', newClassNames);
      }
    });

    fs.writeFileSync(file, document.documentElement.outerHTML, 'utf-8');
  });

})();
