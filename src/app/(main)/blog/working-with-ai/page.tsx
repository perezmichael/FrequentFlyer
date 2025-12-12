'use client';

import { motion } from 'framer-motion';
import styles from './page.module.css';

export default function BlogPost() {
    return (
        <motion.article className={styles.article}>
            <motion.header
                className={styles.header}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <span className={styles.category}>Thoughts</span>
                <h1 className={styles.title}>Working with AI as a UX Designer</h1>
                <p className={styles.meta}>November 23, 2025 • 5 min read</p>
            </motion.header>

            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                <p className={styles.lead}>
                    The landscape of User Experience design is shifting rapidly. As AI tools become more sophisticated, the role of the designer is evolving from pixel-pusher to system architect and curator.
                </p>

                <h2>The New Toolkit</h2>
                <p>
                    Gone are the days when our toolkit was limited to Sketch or Figma. Today, we're pair programming with LLMs, generating assets with diffusion models, and prototyping with code faster than ever before. This shift requires a new mindset—one that embraces ambiguity and rapid iteration.
                </p>

                <h2>Vibe Coding</h2>
                <p>
                    "Vibe coding" is a term that captures this new way of working. It's less about writing perfect syntax and more about communicating intent. As designers, we are uniquely positioned to excel at this. We understand the "vibe"—the emotional resonance of a product—and now we can translate that directly into code with the help of AI agents.
                </p>

                <h2>Designing for Intelligence</h2>
                <p>
                    When we design for AI-powered products, we're not just designing static screens. We're designing for probabilistic outcomes. How does the UI handle a wrong guess by the AI? How do we build trust? These are the new challenges we face.
                </p>

                <blockquote>
                    "The future of design isn't just about how it looks, but how it thinks and adapts to the user."
                </blockquote>

                <h2>Conclusion</h2>
                <p>
                    Embracing AI doesn't mean losing our human touch. In fact, it allows us to focus more on the human aspects of design—empathy, strategy, and storytelling—while the AI handles the execution. Welcome to the lab.
                </p>
            </motion.div>
        </motion.article>
    );
}
