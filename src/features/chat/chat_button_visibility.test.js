import { createGenieVisibilityController } from "./chat_button_visibility";

test("the toolbar shortcut follows header visibility and restores after cleanup", () => {
  document.body.innerHTML = '<a id="wbe-genie-button"></a><a class="wbe-genie-bar-button"></a>';
  const header = document.getElementById("wbe-genie-button");
  header.getBoundingClientRect = () => ({ width: 44, height: 44, top: 20, bottom: 64, left: 20, right: 64 });
  let callback;
  const disconnect = jest.fn();
  global.IntersectionObserver = jest.fn(function (fn) { callback = fn; this.observe = jest.fn(); this.disconnect = disconnect; });
  const controller = createGenieVisibilityController();
  controller.sync();
  const toolbar = document.querySelector('.wbe-genie-bar-button');
  expect(toolbar.hidden).toBe(true);
  callback([{ isIntersecting: false }]);
  expect(toolbar.hidden).toBe(false);
  callback([{ isIntersecting: true }]);
  expect(toolbar.hidden).toBe(true);
  const added = toolbar.cloneNode();
  document.body.appendChild(added);
  controller.sync();
  expect(added.hidden).toBe(true);
  controller.destroy();
  expect(disconnect).toHaveBeenCalled();
  expect(toolbar.hidden).toBe(false);
  delete global.IntersectionObserver;
  document.body.innerHTML = '';
});
