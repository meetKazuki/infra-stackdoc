/// <reference types="vite/client" />

declare module '*.yaml' {
  const content: string
  export default content
}
