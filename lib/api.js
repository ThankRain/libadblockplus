/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

let API = (() =>
{
  const {Filter} = require("filterClasses");
  const {Subscription} = require("subscriptionClasses");
  const {SpecialSubscription} = require("subscriptionClasses");
  const {filterStorage} = require("filterStorage");
  const {defaultMatcher} = require("matcher");
  const {elemHide} = require("elemHide");
  const {elemHideEmulation} = require("elemHideEmulation");
  const {synchronizer} = require("synchronizer");
  const {Prefs} = require("prefs");
  const {notifications} = require("notifications");
  const {recommendations} = require("recommendations");
  const SignatureVerifier = require("rsa");
  const {parseURL} = require("url");
  const {compareVersions} = require("versions");
  const {Utils} = require("utils");

  notifications.locale = Utils.appLocale;

  function getURLInfo(url)
  {
    // Parse the minimum URL to get a URLInfo instance.
    let urlInfo = parseURL("http://a.com/");

    try
    {
      let uri = new URI(url);

      // Note: There is currently no way to update the URLInfo object other
      // than to set the private properties directly.
      urlInfo._href = url;
      urlInfo._protocol = uri.scheme + ":";
      urlInfo._hostname = uri.asciiHost;
    }
    catch (error)
    {
      urlInfo = null;
    }

    return urlInfo;
  }

  return {
    getFilterFromText(text)
    {
      text = Filter.normalize(text);
      if (!text)
        throw "Attempted to create a filter from empty text";
      return Filter.fromText(text);
    },

    isListedFilter(filter)
    {
      for (let subscription of filterStorage.subscriptions(filter.text))
      {
        if (subscription instanceof SpecialSubscription &&
            !subscription.disabled)
          return true;
      }

      return false;
    },

    addFilterToList(filter)
    {
      filterStorage.addFilter(filter);
    },

    removeFilterFromList(filter)
    {
      filterStorage.removeFilter(filter);
    },

    getListedFilters()
    {
      let filterText = new Set();
      for (let subscription of filterStorage.subscriptions())
      {
        if (subscription instanceof SpecialSubscription)
        {
          for (let text of subscription.filterText())
            filterText.add(text);
        }
      }
      return [...filterText].map(Filter.fromText);
    },

    getSubscriptionFromUrl(url)
    {
      return Subscription.fromURL(url);
    },

    isListedSubscription(subscription)
    {
      return filterStorage.hasSubscription(subscription);
    },

    addSubscriptionToList(subscription)
    {
      filterStorage.addSubscription(subscription);

      if (!subscription.lastDownload)
        synchronizer.execute(subscription);
    },

    removeSubscriptionFromList(subscription)
    {
      filterStorage.removeSubscription(subscription);
    },

    updateSubscription(subscription)
    {
      synchronizer.execute(subscription);
    },

    isSubscriptionUpdating(subscription)
    {
      return synchronizer.isExecuting(subscription.url);
    },

    getListedSubscriptions()
    {
      let subscriptions = [];
      for (let subscription of filterStorage.subscriptions())
      {
        if (!(subscription instanceof SpecialSubscription))
          subscriptions.push(subscription);
      }
      return subscriptions;
    },

    getRecommendedSubscriptions()
    {
      let result = [];
      for (let {url, title, homepage, languages} of recommendations())
      {
        let subscription = Subscription.fromURL(url);
        subscription.title = title;
        subscription.homepage = homepage;

        // This isn't normally a property of a Subscription object
        if (languages.length > 0)
          subscription.prefixes = languages.join(",");

        result.push(subscription);
      }
      return result;
    },

    isAASubscription(subscription)
    {
      return subscription.url == Prefs.subscriptions_exceptionsurl;
    },

    setAASubscriptionEnabled(enabled)
    {
      let aaSubscription = null;
      for (let subscription of filterStorage.subscriptions())
      {
        if (API.isAASubscription(subscription))
        {
          aaSubscription = subscription;
          break;
        }
      }
      if (!enabled)
      {
        if (aaSubscription && !aaSubscription.disabled)
          aaSubscription.disabled = true;
        return;
      }
      if (!aaSubscription)
      {
        aaSubscription = Subscription.fromURL(
          Prefs.subscriptions_exceptionsurl);
        filterStorage.addSubscription(aaSubscription);
      }
      if (aaSubscription.disabled)
        aaSubscription.disabled = false;
      if (!aaSubscription.lastDownload)
        synchronizer.execute(aaSubscription);
    },

    isAASubscriptionEnabled()
    {
      for (let subscription of filterStorage.subscriptions())
      {
        if (API.isAASubscription(subscription))
          return !subscription.disabled;
      }
      return false;
    },

    showNextNotification()
    {
      notifications.showNext();
    },

    getNotificationTexts(notification)
    {
      return notifications.getLocalizedTexts(notification);
    },

    markNotificationAsShown(id)
    {
      notifications.markAsShown(id);
    },

    checkFilterMatch(url, contentTypeMask, documentUrl, siteKey, specificOnly)
    {
      let urlInfo = getURLInfo(url);
      if (!urlInfo)
        return null;

      let documentHost = extractHostFromURL(documentUrl);

      // Number cast to 32-bit integer then back to Number
      // before passing to the API
      // @see https://stackoverflow.com/a/11385688
      //
      // During the typecast (upcast) in JsEngine#newValue(int)
      // int -> int64_t (signed long)
      // sign bit is transfered to the new value
      // hence the value becomes negative
      // (0x80000000 -> -0x80000000 = 0x80000000 -> 0xffffffff80000000)
      // we have to convert it to unsigned before passing futher
      contentTypeMask = contentTypeMask >>> 0;

      // Note: This is for compatibility with previous versions of
      // libadblockplus, which relied on this behavior being the default in
      // match() (see https://issues.adblockplus.org/ticket/7003). The
      // _whitelist property is private, but we use it until a proper API is
      // available for looking up whitelist filters first.
      return defaultMatcher._whitelist.match(urlInfo, contentTypeMask,
                                             documentHost, siteKey) ||
             defaultMatcher.match(urlInfo, contentTypeMask, documentHost,
                                  siteKey, specificOnly);
    },

    getElementHidingStyleSheet(domain, specificOnly)
    {
      return elemHide.getStyleSheet(domain, specificOnly).code;
    },

    getElementHidingEmulationSelectors(domain)
    {
      return elemHideEmulation.getFilters(domain);
    },

    getPref(pref)
    {
      return Prefs[pref];
    },

    setPref(pref, value)
    {
      Prefs[pref] = value;
    },

    getHostFromUrl(url)
    {
      return extractHostFromURL(url);
    },

    compareVersions(v1, v2)
    {
      return compareVersions(v1, v2);
    },

    verifySignature(key, signature, uri, host, userAgent)
    {
      return SignatureVerifier.verifySignature(key, signature, uri + "\0" + host + "\0" + userAgent);
    }
  };
})();
