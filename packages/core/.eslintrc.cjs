module.exports = {
    env: {
        es2022: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:import/recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
    },
    plugins: ["import", "@typescript-eslint"],
    settings: {
        "import/resolver": {
            typescript: true,
            node: {
                extensions: [".js", ".ts", ".d.ts"],
            },
        },
    },
    rules: {
        "no-undef": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/no-explicit-any": "error",
        quotes: ["error", "double", { avoidEscape: true }],
        semi: ["error", "always"],
        "no-var": "error",
        "prefer-const": ["error", { destructuring: "all" }],
        eqeqeq: ["error", "always"],
        "import/order": [
            "warn",
            {
                groups: [
                    ["builtin", "external", "internal"],
                    ["parent", "sibling", "index"],
                ],
                "newlines-between": "always",
            },
        ],
    },
};
