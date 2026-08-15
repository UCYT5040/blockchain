<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import PixelWindowBackground from './PixelWindowBackground.svelte';

	type DivProps = SvelteHTMLElements['div'];

	interface Props extends DivProps {
		advanced?: boolean;
		children: Snippet;
	}

	let { class: className, advanced = false, children, ...otherProps }: Props = $props();

    let divElement: HTMLDivElement | null = $state(null);

    let width: number | undefined = $state(undefined);
    let height: number | undefined = $state(undefined);

    function updateSize() {
        if (!divElement) {
            return;
        }
        const { width: newWidth, height: newHeight } = divElement.getBoundingClientRect();
        width = newWidth;
        height = newHeight;
    }

    onMount(updateSize)
</script>

<div {...otherProps} class={`pixel-window ${className ?? ''}`} bind:this={divElement} onresize={updateSize}>
    <PixelWindowBackground {advanced} {width} {height} class="pixel-window-background" />
	{@render children()}
</div>

<style>
	.pixel-window {
		/* Allow the background to be absolutely positioned within the window */
		position: relative;
		isolation: isolate;
        /* Padding based on the background's border (24px) + a little extra */
        padding: calc(24px + 1em);
	}

    :global(.pixel-window-background) {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
    }
</style>
