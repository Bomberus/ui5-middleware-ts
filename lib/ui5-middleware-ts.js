/**
 * Typescript Transpiler
 *
 * @param {object} parameters Parameters
 * @param {object} parameters.resources Resource collections
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.all Reader or Collection to read resources of the
 *                                        root project and its dependencies
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.rootProject Reader or Collection to read resources of
 *                                        the project the server is started in
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.dependencies Reader or Collection to read resources of
 *                                        the projects dependencies
 * @param {object} parameters.middlewareUtil Specification version dependent interface to a
 *                                        [MiddlewareUtil]{@link module:@ui5/server.middleware.MiddlewareUtil} instance
 * @param {object} parameters.options Options
 * @param {string} [parameters.options.configuration] Custom server middleware configuration if given in ui5.yaml
 * @returns {function} Middleware function to use
 */

module.exports = function ({ resources, middlewareUtil, options }) {
  const { transpileTS } = require("ui5-ts-amd");
  const { join } = require("path");
  const { readFileSync } = require("fs");
  const config = options.configuration || { appId: "" };
  const { appId } = config;

  const tsConfig = JSON.parse(readFileSync(join('tsconfig.json')).toString());
        tsConfig.compilerOptions.sourceMap = true;
        tsConfig.compilerOptions.inlineSourceMap = true;

  return function (req, res, next) {
    if (!req.path.endsWith(".js")) {
      next();
      return;
    }

    resources.rootProject
      .byPath(req.path.replace(".js", ".ts"))
      .then(async (resource) => {
        if (!resource){
          next();
          return;
        }
        
        let tsFile = (await resource.getBuffer()).toString();
        const namespace = appId +
          resource
            .getPath()
            .replace("/", ".")
            .replace(".controller.", "")
            .replace(".ts", "");
          
        const js = transpileTS(
          namespace,
          resource.getPath().substr(1),
          tsFile,
          tsConfig
        );
        
        res.type(".js");
        res.end(resource.getPath().indexOf("/Component.ts") > -1 ? 
          readFileSync(join('node_modules/ui5-ts-amd/lib/ts-polyfill.js')).toString() + "\n" +  js : 
          js 
        );
      })
    .catch(e => console.error(e));
  };
};
