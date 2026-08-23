<script>
	import { resolve } from '$app/paths';
	import PixelWindow from '$lib/components/PixelWindow.svelte';
	import FAQ from '$lib/components/FAQ.svx';
</script>

<header>
	<h1>BlockChain</h1>
	<nav>
		<a href="#faq">FAQ</a>
		<a href={resolve('/auth')}>Get started</a>
		<a href={resolve('/docs')}>Docs</a>
	</nav>
</header>

<main>
	<section id="how-it-works">
		<h2>How it works</h2>
		<PixelWindow class="step">
			<h3>Step 1</h3>
			<p>Create cool programs</p>
			<figure>
				<img src="/images/turtle.png" alt="A turtle mining" />
				<figcaption>A turtle mining</figcaption>
			</figure>
			<figure>
				<img
					src="/images/peripherals.png"
					alt="A monitor displaying how full a connected chest is"
				/>
				<figcaption>A monitor displaying how full a connected chest is</figcaption>
			</figure>
		</PixelWindow>
		<PixelWindow class="step">
			<h3>Step 2</h3>
			<p>Track your time</p>
			<p>Use your regular code editor with Hackatime.</p>
			<p>Drag and drop your programs into Minecraft to run them!</p>
		</PixelWindow>
		<PixelWindow class="step">
			<h3>Step 3</h3>
			<p>Get prizes</p>
		</PixelWindow>
	</section>
	<section id="faq">
		<h2>FAQ</h2>
		<FAQ />
	</section>
</main>

<footer>
	<p>
		<small>
			Images licensed under <a href="https://mozilla.org/en-US/MPL/2.0/">MPL 2.0</a>. Source:
			<a
				href="https://github.com/cc-tweaked/CC-Tweaked/commit/8aa7695fdd781b9f7345998fd9e3ae531438d963"
				>CC: Tweaked</a
			>.
		</small>
	</p>
</footer>

<style>
	header {
		text-align: center;
	}

	nav {
		display: flex;
		justify-content: center;
		gap: 4em;
	}

	#how-it-works {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4em;
		width: 100%;
	}

	:global(.step) {
        width: 80%;
	}

	#faq {
		margin-left: 10%;
	}
</style>
