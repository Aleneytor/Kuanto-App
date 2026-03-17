import React from 'react';
import Svg, { Path } from 'react-native-svg';

const TusDatosIcon = ({ width = 24, height = 24, color = "#02DF82" }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 9h16" />
            <Path d="M4 15h16" />
            <Path d="M10 3L8 21" />
            <Path d="M16 3L14 21" />
        </Svg>
    );
};

export default TusDatosIcon;
