function getLastSuggestedItems(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const lastAssistant = [...history]
      .reverse()
      .find((item) => item && item.role === "assistant");

  if (
    lastAssistant &&
    lastAssistant.metadata &&
    Array.isArray(lastAssistant.metadata.lastSuggestedItems)
  ) {
    return lastAssistant.metadata.lastSuggestedItems;
  }

  return [];
}

module.exports = {
  getLastSuggestedItems,
};