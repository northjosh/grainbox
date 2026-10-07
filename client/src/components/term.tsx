import { Terminal } from '@xterm/xterm'
import { useEffect, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'

type TermProps = {
    sandboxName: string
}

export function Term({ sandboxName }: TermProps) {
    const termRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const container = termRef.current
        if (!container) return

        const terminal = new Terminal({
            cursorBlink: true,
            convertEol: true,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13,
            theme: {
                background: '#111411',
                foreground: '#e6ece5',
                cursor: '#d2ed61',
            },
        })
        terminal.open(container)
        terminal.writeln(`Connecting to ${sandboxName}...`)

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        const socket = new WebSocket(
            `${protocol}//${location.host}/api/sandboxes/${encodeURIComponent(sandboxName)}/ws`,
        )

        const sendResize = (rows: number, cols: number) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'resize', rows, cols }))
            }
        }

        socket.addEventListener('open', () => {
            terminal.writeln(`Connected to ${sandboxName}\r\n`)
            sendResize(terminal.rows, terminal.cols)
        })

        socket.addEventListener('message', (event: MessageEvent<string>) => {
            const message = event.data
            try {
                const parsed: unknown = JSON.parse(message)
                if (
                    typeof parsed === 'object' &&
                    parsed !== null &&
                    'type' in parsed &&
                    parsed.type === 'exit' &&
                    'code' in parsed
                ) {
                    terminal.writeln(`\r\n[shell exited: ${String(parsed.code)}]`)
                    return
                }
            } catch {
                // Shell output is plain text; only control messages are JSON.
            }

            terminal.write(message)
        })

        socket.addEventListener('close', () => {
            terminal.writeln('\r\n[disconnected]')
        })

        socket.addEventListener('error', () => {
            terminal.writeln('\r\n[WebSocket error]')
        })

        const input = terminal.onData((data) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'input', data }))
            }
        })

        const resize = terminal.onResize(({ rows, cols }) => {
            sendResize(rows, cols)
        })

        return () => {
            input.dispose()
            resize.dispose()
            socket.close()
            terminal.dispose()
        }
    }, [sandboxName])

    return <div ref={termRef} className="h-[28rem] w-full overflow-hidden" />
}