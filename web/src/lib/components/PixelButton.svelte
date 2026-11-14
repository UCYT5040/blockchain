<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import PixelBackground from './PixelBackground.svelte';

	type ButtonProps = SvelteHTMLElements['button'];

	interface Props extends ButtonProps {
		advanced?: boolean;
		children: Snippet;
	}

	let { class: className, advanced = false, children, ...otherProps }: Props = $props();
</script>

<button {...otherProps} class={`pixel-button ${className ?? ''}`}>
	<PixelBackground {advanced} class="pixel-button-background" />
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

	.pixel-button:disabled {
		cursor: not-allowed;
		filter: grayscale(1) brightness(0.8);
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
