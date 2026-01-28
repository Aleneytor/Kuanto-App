import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import {
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
    TestIds
} from 'react-native-google-mobile-ads';
import { useTheme } from '../context/ThemeContext';

// Use test IDs in development, real IDs in production
const adUnitId = __DEV__
    ? TestIds.NATIVE
    : 'ca-app-pub-7187537412845196/3386346046';

const NativeAdComponent = ({ style }) => {
    return null; // Ad disabled by user request
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: 20,
        marginVertical: 12,
    },
    adView: {
        padding: 16,
    },
    adLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    adContent: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    icon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 12,
    },
    textContent: {
        flex: 1,
        justifyContent: 'center',
    },
    headline: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    body: {
        fontSize: 13,
        lineHeight: 18,
    },
    media: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 12,
    },
    ctaButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    ctaText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default NativeAdComponent;
