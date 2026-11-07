import useLocalStorage from './useLocalStorage';

// Weekly reviews that have been saved, oldest first. Saving a second review of the same week
// replaces the first, so going through it again just updates it.
function useReviews() {
  const [reviews, setReviews] = useLocalStorage('reviews', []);

  function saveReview(review) {
    setReviews((current) => [...current.filter((r) => r.week !== review.week), { ...review, savedAt: Date.now() }]);
  }

  return { reviews, saveReview };
}

export default useReviews;
