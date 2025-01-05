import OG from '$lib/components/OG.svelte'
import { Resvg } from '@resvg/resvg-js'
import { render } from 'svelte/server'
import satori from 'satori'
import { html as toReactNode } from 'satori-html'

const height = 630
const width = 1200

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ params, url, fetch }) => {
    const type = params.type
    const result = render(OG, {
        props: {
            type: type as 'og' | 'twitter',
            url: url.origin
        }
    })
    const element = toReactNode(`${result.body}<style>${result.head}</style>`)

    try {
        // Load fonts as ArrayBuffer with explicit error handling
        const [latoRegular, latoExtraBold, latoExtraBoldItalic] = await Promise.all([
            fetch(new URL('/fonts/lato/Lato-Regular.ttf', url.origin))
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to load Lato-Regular.ttf: ${res.status}`)
                    return res.arrayBuffer()
                }),
            fetch(new URL('/fonts/lato/Lato-ExtraBold.ttf', url.origin))
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to load Lato-ExtraBold.ttf: ${res.status}`)
                    return res.arrayBuffer()
                }),
            fetch(new URL('/fonts/lato/Lato-ExtraBoldItalic.ttf', url.origin))
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to load Lato-ExtraBoldItalic.ttf: ${res.status}`)
                    return res.arrayBuffer()
                })
        ])

        const svg = await satori(element, {
            fonts: [
                {
                    name: 'Lato',
                    data: latoRegular,
                    weight: 400,
                    style: 'normal'
                },
                {
                    name: 'Lato',
                    data: latoExtraBold,
                    weight: 800,
                    style: 'normal'
                },
                {
                    name: 'Lato',
                    data: latoExtraBoldItalic,
                    weight: 800,
                    style: 'italic'
                }
            ],
            height,
            width
        })

        const resvg = new Resvg(svg, {
            fitTo: {
                mode: 'width',
                value: width
            }
        })

        const image = resvg.render()

        return new Response(image.asPng(), {
            headers: {
                'content-type': 'image/png'
            }
        })
    } catch (error) {
        console.error('Error generating image:', error)
        return new Response(`Failed to generate image: ${error.message}`, { status: 500 })
    }
}
