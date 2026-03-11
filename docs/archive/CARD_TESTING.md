# Testing Card Clickability

## Manual Testing Steps

1. Start a new game of Shithead with 2 players
2. Click "Start Game"
3. Wait for the SWAP phase to load (you'll see 3 hand cards and 3 face-up cards)
4. **Open Browser Console** (F12 or Cmd+Option+J)
5. Look for these logs:
   - `[Swap] Hand listener attached and ready for clicks`
   - `[Swap] FaceUp listener attached and ready for clicks`

## Testing Clicks

When you see those logs, try clicking a card. You should see:
- `[Click] Hand card clicked: 5-♣-0` (or similar with different rank/suit)
- The card should get a golden border and lift up
- Click a face-up card next
- `[Click] FaceUp card clicked: 3-♥-1` (or similar)
- Both cards should be selected, then the swap happens

## If Cards Don't Click

### Check 1: Are the logs appearing?
- If you DON'T see "[Swap] Hand listener attached", the page might not have loaded the shithead game properly
- Try refreshing and starting the game again

### Check 2: Are the cards visible?
- You should see 3 cards in the "HAND CARDS" section
- You should see 3 cards in the "FACE-UP CARDS" section
- Cards should show rank values like "5", "K", "A" (not "undefined")

### Check 3: Try clicking anyway
- Even if you don't see the log appear, try clicking a card
- The log WILL appear when you click if listeners are attached

## Known Issues

None currently - all tests pass and show cards are clickable!
