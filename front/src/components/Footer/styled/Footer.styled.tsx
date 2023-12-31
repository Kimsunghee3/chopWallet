import styled from "styled-components"
import { ISizeProps } from "@utils/interFace/styled.interface"

export const FooterWrapper = styled.div<ISizeProps>`
    width: 100%;
    height: 7rem;
    background: ${({ theme, mode }) => mode && theme[mode].basicBg};
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 700;
`
export const FooterWrap = styled.ul`
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 6rem;
    list-style: none;
    display: flex;
    align-items: center;
`

export const IconWrapper = styled.li<ISizeProps>`
    & > a > svg {
        font-size: 2.2rem;
        color: ${({ theme, mode, color }) => (color === "true" && mode && theme[mode].footerColor) || (mode && theme[mode].text)};
    }
    
    &,
    & > a {
        width: ${(props) => props.width || "25%"};
        height: 100%;
        color: ${({ theme, mode, color }) => (color === "true" && mode && theme[mode].footerColor) || (mode && theme[mode].text)};
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        font-size: 1.4rem;
    }
`
