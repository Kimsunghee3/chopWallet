import { ISizeProps } from "@utils/interFace/styled.interface"
import { styled } from "styled-components"

export const PriceCardWrap = styled.div<ISizeProps>`
    display:flex;
    align-items:center;
    justify-content: space-between;
    width: ${(props) => props.width || "100%"};
    height: ${(props) => props.height || "32.5%"};
    color: ${(props) => props.color || "#FFBD62"};
    font-size: 1rem;
    font-weight: 600;
`

export const PriceCardCurreny = styled.div`
`

export const PriceCardValue = styled.div`
    
`