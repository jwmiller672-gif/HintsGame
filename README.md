# Non-Developer Guide for GuessItGame

This guide is designed to help you manage the `GuessItGame` application without needing deep technical knowledge.

## 🚀 How to Redeploy the Application

If you have made changes to the code and want to update the live website, follow these steps:

1.  Open your **Terminal**.
2.  Make sure you are in the project folder (`guessit`).
3.  Run the following command and press **Enter**:

```bash
npm run deploy
```

This script will automatically build the latest version of your app and publish it to the website. It may take a minute or two. When it's done, you should see a "Published" message.

## 💾 How to Save Your Changes (Commit & Push)

To save your work to the history and upload it to GitHub, follow these three steps in the Terminal:

1.  **Stage your changes** (tell Git which files to save):
    ```bash
    git add .
    ```

2.  **Commit your changes** (save them with a label):
    ```bash
    git commit -m "Describe what you changed here"
    ```
    *Replace "Describe what you changed here" with a short sentence about your update.*

3.  **Push your changes** (upload to GitHub):
    ```bash
    git push
    ```

## ⏪ How to Undo Mistakes (Revert)

If you made a mistake and want to go back to a previous version, use the `git revert` command. This is safer than "resetting" because it creates a *new* save that undoes the bad changes, keeping the history intact.

1.  **Find the "Commit Hash"**:
    Run this command to see a list of recent saves:
    ```bash
    git log --oneline
    ```
    You will see a list like this:
    ```
    a1b2c3d Fixed the typo
    e5f6g7h Broke the layout
    i8j9k0l Initial version
    ```
    The code on the left (e.g., `e5f6g7h`) is the **Commit Hash**.

2.  **Revert the specific change**:
    Take the hash of the *bad* commit you want to undo (for example, the one that "Broke the layout") and run:
    ```bash
    git revert e5f6g7h
    ```
    *(Replace `e5f6g7h` with your actual code)*.

3.  **Save the reversion**:
    Your text editor might open asking for a message. If it's Vim (looks scary), type `:wq` and press **Enter** to save and quit. If it's simple text, just save and close.

4.  **Upload the fix**:
    ```bash
    git push
    ```
