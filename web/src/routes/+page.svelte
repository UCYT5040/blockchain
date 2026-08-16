<script>
	import { resolve } from '$app/paths';
	import PixelWindow from '$lib/components/PixelWindow.svelte';
</script>

<header>
	<h1>BlockChain</h1>
	<nav>
		<a href="#faq">FAQ</a>
		<a href={resolve('/auth')}>Get started</a>
	</nav>
</header>

<main>
	<section>
		<h2>How it works</h2>
		<PixelWindow>
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
		<PixelWindow>
			<h3>Step 2</h3>
			<p>Track your time</p>
		</PixelWindow>
		<PixelWindow>
			<h3>Step 3</h3>
			<p>Get prizes</p>
		</PixelWindow>
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
</style>
