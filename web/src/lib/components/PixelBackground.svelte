<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';

	type SVGProps = SvelteHTMLElements['svg'];

	interface Props extends SVGProps {
		advanced?: boolean;
		width?: number;
		height?: number;
	}

	let { advanced = false, width = 600, height = 400, ...otherProps }: Props = $props();

	interface Rect {
		x: number;
		y: number;
		width: number;
		height: number;
		style: string;
	}

	const cornerSize = 24;

	const corners: Record<string, Rect[]> = {
		topLeft: [
			{
				x: 4,
				y: 0,
				width: 20,
				height: 2,
				style: 'border'
			},
			{
				x: 2,
				y: 2,
				width: 2,
				height: 2,
				style: 'border-corner'
			},
			{
				x: 4,
				y: 2,
				width: 20,
				height: 4,
				style: 'border-inner-bottom-right'
			},
			{
				x: 0,
				y: 4,
				width: 2,
				height: 2,
				style: 'border-corner'
			},
			{
				x: 2,
				y: 4,
				width: 2,
				height: 20,
				style: 'border-inner-bottom-right'
			},
			{
				x: 0,
				y: 6,
				width: 2,
				height: 18,
				style: 'border'
			},
			{
				x: 4,
				y: 6,
				width: 4,
				height: 2,
				style: 'border-inner-bottom-right'
			},
			{
				x: 8,
				y: 6,
				width: 16,
				height: 14,
				style: 'border-main'
			},
			{
				x: 4,
				y: 8,
				width: 2,
				height: 16,
				style: 'border-inner-bottom-right'
			},
			{
				x: 6,
				y: 8,
				width: 2,
				height: 16,
				style: 'border-main'
			},
			{
				x: 8,
				y: 20,
				width: 12,
				height: 4,
				style: 'border-main'
			},
			{
				x: 20,
				y: 20,
				width: 4,
				height: 2,
				style: 'border-inner-top-left'
			},
			{
				x: 20,
				y: 22,
				width: 2,
				height: 2,
				style: 'border-inner-top-left'
			},
			{
				x: 22,
				y: 22,
				width: 2,
				height: 2,
				style: 'border'
			}
		],
		topRight: [
			{
				x: 0,
				y: 0,
				width: 18,
				height: 2,
				style: 'border'
			},
			{
				x: 0,
				y: 2,
				width: 18,
				height: 4,
				style: 'border-inner-bottom-right'
			},
			{
				x: 18,
				y: 2,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 18,
				y: 4,
				width: 2,
				height: 2,
				style: 'border-main'
			},
			{
				x: 20,
				y: 4,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 0,
				y: 6,
				width: 18,
				height: 14,
				style: 'border-main'
			},
			{
				x: 18,
				y: 6,
				width: 4,
				height: 18,
				style: 'border-inner-top-left'
			},
			{
				x: 22,
				y: 6,
				width: 2,
				height: 18,
				style: 'border'
			},
			{
				x: 0,
				y: 20,
				width: 4,
				height: 2,
				style: 'border-inner-top-left'
			},
			{
				x: 4,
				y: 20,
				width: 14,
				height: 4,
				style: 'border-main'
			},
			{
				x: 0,
				y: 22,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 2,
				y: 22,
				width: 2,
				height: 2,
				style: 'border-inner-bottom-right'
			}
		],
		bottomLeft: [
			{
				x: 0,
				y: 0,
				width: 2,
				height: 18,
				style: 'border'
			},
			{
				x: 2,
				y: 0,
				width: 4,
				height: 18,
				style: 'border-inner-bottom-right'
			},
			{
				x: 6,
				y: 0,
				width: 14,
				height: 18,
				style: 'border-main'
			},
			{
				x: 20,
				y: 0,
				width: 2,
				height: 4,
				style: 'border-inner-top-left'
			},
			{
				x: 22,
				y: 0,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 22,
				y: 2,
				width: 2,
				height: 2,
				style: 'border-inner-bottom-right'
			},
			{
				x: 20,
				y: 4,
				width: 4,
				height: 14,
				style: 'border-main'
			},
			{
				x: 2,
				y: 18,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 4,
				y: 18,
				width: 2,
				height: 2,
				style: 'border-main'
			},
			{
				x: 6,
				y: 18,
				width: 18,
				height: 4,
				style: 'border-inner-top-left'
			},
			{
				x: 4,
				y: 20,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 6,
				y: 22,
				width: 18,
				height: 2,
				style: 'border'
			}
		],
		bottomRight: [
			{
				x: 0,
				y: 0,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 2,
				y: 0,
				width: 2,
				height: 4,
				style: 'border-inner-bottom-right'
			},
			{
				x: 4,
				y: 0,
				width: 14,
				height: 16,
				style: 'border-main'
			},
			{
				x: 18,
				y: 0,
				width: 4,
				height: 20,
				style: 'border-inner-top-left'
			},
			{
				x: 22,
				y: 0,
				width: 2,
				height: 20,
				style: 'border'
			},
			{
				x: 0,
				y: 2,
				width: 2,
				height: 2,
				style: 'border-inner-bottom-right'
			},
			{
				x: 0,
				y: 4,
				width: 4,
				height: 14,
				style: 'border-main'
			},
			{
				x: 4,
				y: 16,
				width: 12,
				height: 2,
				style: 'border-main'
			},
			{
				x: 16,
				y: 16,
				width: 2,
				height: 6,
				style: 'border-inner-top-left'
			},
			{
				x: 0,
				y: 18,
				width: 16,
				height: 4,
				style: 'border-inner-top-left'
			},
			{
				x: 18,
				y: 20,
				width: 2,
				height: 2,
				style: 'border-inner-top-left'
			},
			{
				x: 20,
				y: 20,
				width: 2,
				height: 2,
				style: 'border'
			},
			{
				x: 0,
				y: 22,
				width: 20,
				height: 2,
				style: 'border'
			}
		]
	};

	const noTypePrefix = ['border', 'background', 'corner'];

	function corner(
		corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
		x: number,
		y: number
	): Rect[] {
		return corners[corner].map((rect) => {
			const hasTypePrefix = !noTypePrefix.includes(rect.style);
			const finalStyle = `${hasTypePrefix ? (advanced ? 'advanced-' : 'basic-') : ''}${rect.style}`;
			return {
				x: rect.x + x,
				y: rect.y + y,
				width: rect.width,
				height: rect.height,
				style: finalStyle
			};
		});
	}

	function createRect(
		direction: 'horizontal' | 'vertical',
		offset: number,
		size: number,
		style: string
	): Rect {
		const hasTypePrefix = !noTypePrefix.includes(style);
		const finalStyle = `${hasTypePrefix ? (advanced ? 'advanced-' : 'basic-') : ''}${style}`;
		if (direction === 'horizontal') {
			return {
				x: cornerSize,
				y: offset,
				width: width - 2 * cornerSize,
				height: size,
				style: finalStyle
			};
		} else {
			return {
				x: offset,
				y: cornerSize,
				width: size,
				height: height - 2 * cornerSize,
				style: finalStyle
			};
		}
	}

	let rects: Rect[] = $derived.by(() => {
		const rightOffset = width - cornerSize;
		const bottomOffset = height - cornerSize;
		return [
			// Left
			createRect('vertical', 0, 2, 'border'),
			createRect('vertical', 2, 4, 'border-top-left'),
			createRect('vertical', 6, 14, 'border-main'),
			createRect('vertical', 20, 2, 'border-inner-top-left'),
			createRect('vertical', 22, 2, 'border'),
			// Top
			createRect('horizontal', 0, 2, 'border'),
			createRect('horizontal', 2, 4, 'border-top-left'),
			createRect('horizontal', 6, 14, 'border-main'),
			createRect('horizontal', 20, 2, 'border-inner-top-left'),
			createRect('horizontal', 22, 2, 'border'),
			// Right
			createRect('vertical', rightOffset, 2, 'border'),
			createRect('vertical', rightOffset + 2, 2, 'border-inner-bottom-right'),
			createRect('vertical', rightOffset + 4, 14, 'border-main'),
			createRect('vertical', rightOffset + 18, 4, 'border-bottom-right'),
			createRect('vertical', rightOffset + 22, 2, 'border'),
			// Bottom
			createRect('horizontal', bottomOffset, 2, 'border'),
			createRect('horizontal', bottomOffset + 2, 2, 'border-inner-bottom-right'),
			createRect('horizontal', bottomOffset + 4, 14, 'border-main'),
			createRect('horizontal', bottomOffset + 18, 4, 'border-bottom-right'),
			createRect('horizontal', bottomOffset + 22, 2, 'border'),
			// Corners
			...corner('topLeft', 0, 0),
			...corner('topRight', width - cornerSize, 0),
			...corner('bottomLeft', 0, height - cornerSize),
			...corner('bottomRight', width - cornerSize, height - cornerSize),
			{
				x: cornerSize,
				y: cornerSize,
				width: width - 2 * cornerSize,
				height: height - 2 * cornerSize,
				style: 'background'
			}
		];
	});
</script>

<svg {width} {height} {...otherProps}>
	{#each rects as rect, i (i)}
		<rect
			x={rect.x}
			y={rect.y}
			width={rect.width}
			height={rect.height}
			style={`fill: var(--${rect.style}-color)`}
		/>
	{/each}
</svg>
