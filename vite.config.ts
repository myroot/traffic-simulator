import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: 깃허브 레포지토리 이름이 'traffic-simulator'라면 아래 주석을 해제해주세요
  // base: '/traffic-simulator/', 
})
