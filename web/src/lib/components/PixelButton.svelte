<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import PixelBackground from './PixelBackground.svelte';

	type ButtonProps = SvelteHTMLElements['button'];

	interface Props extends ButtonProps {
		advanced?: boolean;
		children: Snippet;
	}

	let { class: className, advanced = false, children, ...otherProps }: Props = $props();

    let buttonElement: HTMLButtonElement | null = $state(null);

    let width: number | undefined = $state(undefined);
    let height: number | undefined = $state(undefined);

    function updateSize() {
        if (!buttonElement) {
            return;
        }
        const { width: newWidth, height: newHeight } = buttonElement.getBoundingClientRect();
        width = newWidth;
        height = newHeight;
    }

    onMount(updateSize)
</script>

<button {...otherProps} class={`pixel-button ${className ?? ''}`} bind:this={buttonElement} onresize={updateSize}>
    <PixelBackground {advanced} {width} {height} class="pixel-button-background" />
	{@render children()}
</button>

<style>
	.pixel-button {
		/* Allow the background to be absolutely positioned within the window */
		position: relative;
		isolation: isolate;
        /* Padding based on the background's border (24px) + a little extra */
        padding: calc(24px + 1em);
        /* Remove all default button styling */
		background: transparent;
		border: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

    :global(.pixel-button-background) {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
    }

    :global(.pixel-button:hover .pixel-button-background) {
        filter: brightness(1.2);
    }
</style>
