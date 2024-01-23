
function deramp(data) {
    return new window.Promise(
        exportFunction(function (resolve, reject) {
            browser.runtime
                .sendMessage({ type: "prepareSession", redirectUrl: data.redirectUrl, urlFilters: data.urlFilters })
                .then(
                    (data) => {
                        resolve(cloneInto(data, window));
                    },
                    (error) => {
                        console.error("deramp error: ", error);
                        reject("An error occurred in deramp");
                    }
                );
        }, window)
    );
}
exportFunction(deramp, window, { defineAs: "derampInject" });

