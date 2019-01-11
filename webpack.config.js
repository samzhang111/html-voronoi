module.exports = {
    entry: "./voronoi.js",
    output: {
        path: __dirname,
        filename: "voronoi-bundle.js",
        library: 'voronoize',
        libraryTarget: 'var'
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    }
}
