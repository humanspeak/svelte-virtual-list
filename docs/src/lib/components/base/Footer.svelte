<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
</script>

<footer>
    <p class="w-full justify-center gap-2 text-center">
        <span>Made with</span>
        <motion.span
            animate={{
                scale: [1, 1.2, 1, 1.1, 1]
            }}
            transition={{
                duration: 1.2,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: 'easeInOut'
            }}
            style="transform-origin: center center;"
            class="inline-block origin-center align-middle leading-none"
        >
            <i class="fa-duotone fa-heart"></i>
        </motion.span>
        <span>by</span>
        <a class="humanspeak" target="_blank" rel="noopener" href="https://humanspeak.com"
            >Humanspeak</a
        >
    </p>
</footer>

<style>
    p {
        display: inline-flex;
        align-items: center;
        margin: 0 !important;
    }

    .fa-heart {
        --fa-secondary-color: red;
    }
</style>
