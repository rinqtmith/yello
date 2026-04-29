import { spawn } from 'node:child_process'

const [command = 'dev', ...args] = process.argv.slice(2)
const isLinux = process.platform === 'linux'
const shouldDisableSandbox =
  isLinux &&
  (command === 'dev' || command === 'preview') &&
  process.env.YELLO_ENABLE_SANDBOX !== '1'

const electronViteArgs = [command, ...args]

if (shouldDisableSandbox) {
  electronViteArgs.push('--noSandbox')
}

const child = spawn('pnpm', ['exec', 'electron-vite', ...electronViteArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

