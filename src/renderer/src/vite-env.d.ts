/// <reference types="vite/client" />

import type { YelloApi } from '@shared/types'

declare global {
  interface Window {
    yello: YelloApi
  }
}

export {}
