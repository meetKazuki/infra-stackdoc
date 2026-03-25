export default {
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
};
