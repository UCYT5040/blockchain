<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		advanced?: boolean;
		width?: number | string;
		height?: number | string;
	}

	let {
		advanced = false,
		width,
		height,
		class: className,
		style: customStyle,
		...otherProps
	}: Props = $props();

	interface Rect {
		x: number;
		y: number;
		width: number;
		height: number;
		style: string;
	}

	const corners: Record<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', Rect[]> = {
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

	const topEdgeRects: Rect[] = [
		{ x: 0, y: 0, width: 1, height: 2, style: 'border' },
		{ x: 0, y: 2, width: 1, height: 4, style: 'border-top-left' },
		{ x: 0, y: 6, width: 1, height: 14, style: 'border-main' },
		{ x: 0, y: 20, width: 1, height: 2, style: 'border-inner-top-left' },
		{ x: 0, y: 22, width: 1, height: 2, style: 'border' }
	];

	const bottomEdgeRects: Rect[] = [
		{ x: 0, y: 0, width: 1, height: 2, style: 'border' },
		{ x: 0, y: 2, width: 1, height: 2, style: 'border-inner-bottom-right' },
		{ x: 0, y: 4, width: 1, height: 14, style: 'border-main' },
		{ x: 0, y: 18, width: 1, height: 4, style: 'border-bottom-right' },
		{ x: 0, y: 22, width: 1, height: 2, style: 'border' }
	];

	const leftEdgeRects: Rect[] = [
		{ x: 0, y: 0, width: 2, height: 1, style: 'border' },
		{ x: 2, y: 0, width: 4, height: 1, style: 'border-top-left' },
		{ x: 6, y: 0, width: 14, height: 1, style: 'border-main' },
		{ x: 20, y: 0, width: 2, height: 1, style: 'border-inner-top-left' },
		{ x: 22, y: 0, width: 2, height: 1, style: 'border' }
	];

	const rightEdgeRects: Rect[] = [
		{ x: 0, y: 0, width: 2, height: 1, style: 'border' },
		{ x: 2, y: 0, width: 2, height: 1, style: 'border-inner-bottom-right' },
		{ x: 4, y: 0, width: 14, height: 1, style: 'border-main' },
		{ x: 18, y: 0, width: 4, height: 1, style: 'border-bottom-right' },
		{ x: 22, y: 0, width: 2, height: 1, style: 'border' }
	];

	const noTypePrefix = ['border', 'background', 'corner'];

	function getFill(style: string) {
		const hasTypePrefix = !noTypePrefix.includes(style);
		const finalStyle = `${hasTypePrefix ? (advanced ? 'advanced-' : 'basic-') : ''}${style}`;
		return `var(--${finalStyle}-color)`;
	}

	let computedStyle = $derived.by(() => {
		const styles: string[] = [];
		if (width !== undefined) {
			styles.push(`width: ${typeof width === 'number' ? `${width}px` : width}`);
		}
		if (height !== undefined) {
			styles.push(`height: ${typeof height === 'number' ? `${height}px` : height}`);
		}
		if (customStyle) {
			styles.push(customStyle);
		}
		return styles.length > 0 ? styles.join('; ') : undefined;
	});
</script>

<div
	{...otherProps}
	class={`pixel-background ${className ?? ''}`}
	style={computedStyle}
	aria-hidden="true"
>
	<!-- Corners -->
	<svg
		class="pixel-corner pixel-corner-tl"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		shape-rendering="crispEdges"
	>
		{#each corners.topLeft as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>
	<svg
		class="pixel-corner pixel-corner-tr"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		shape-rendering="crispEdges"
	>
		{#each corners.topRight as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>
	<svg
		class="pixel-corner pixel-corner-bl"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		shape-rendering="crispEdges"
	>
		{#each corners.bottomLeft as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>
	<svg
		class="pixel-corner pixel-corner-br"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		shape-rendering="crispEdges"
	>
		{#each corners.bottomRight as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>

	<!-- Edges -->
	<svg
		class="pixel-edge pixel-edge-top"
		viewBox="0 0 1 24"
		preserveAspectRatio="none"
		shape-rendering="crispEdges"
	>
		{#each topEdgeRects as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>
	<svg
		class="pixel-edge pixel-edge-bottom"
		viewBox="0 0 1 24"
		preserveAspectRatio="none"
		shape-rendering="crispEdges"
	>
		{#each bottomEdgeRects as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>
	<svg
		class="pixel-edge pixel-edge-left"
		viewBox="0 0 24 1"
		preserveAspectRatio="none"
		shape-rendering="crispEdges"
	>
		{#each leftEdgeRects as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>
	<svg
		class="pixel-edge pixel-edge-right"
		viewBox="0 0 24 1"
		preserveAspectRatio="none"
		shape-rendering="crispEdges"
	>
		{#each rightEdgeRects as rect}
			<rect
				x={rect.x}
				y={rect.y}
				width={rect.width}
				height={rect.height}
				fill={getFill(rect.style)}
			/>
		{/each}
	</svg>

	<!-- Center -->
	<div class="pixel-center"></div>
</div>

<style>
	.pixel-background {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.pixel-corner,
	.pixel-edge {
		position: absolute;
		display: block;
	}

	.pixel-corner-tl {
		top: 0;
		left: 0;
		width: 24px;
		height: 24px;
	}

	.pixel-corner-tr {
		top: 0;
		right: 0;
		width: 24px;
		height: 24px;
	}

	.pixel-corner-bl {
		bottom: 0;
		left: 0;
		width: 24px;
		height: 24px;
	}

	.pixel-corner-br {
		bottom: 0;
		right: 0;
		width: 24px;
		height: 24px;
	}

	.pixel-edge-top {
		top: 0;
		left: 24px;
		right: 24px;
		height: 24px;
		width: calc(100% - 48px);
	}

	.pixel-edge-bottom {
		bottom: 0;
		left: 24px;
		right: 24px;
		height: 24px;
		width: calc(100% - 48px);
	}

	.pixel-edge-left {
		top: 24px;
		bottom: 24px;
		left: 0;
		width: 24px;
		height: calc(100% - 48px);
	}

	.pixel-edge-right {
		top: 24px;
		bottom: 24px;
		right: 0;
		width: 24px;
		height: calc(100% - 48px);
	}

	.pixel-center {
		position: absolute;
		top: 24px;
		bottom: 24px;
		left: 24px;
		right: 24px;
		background-color: var(--background-color);
	}
</style>
