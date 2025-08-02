document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    
    // Display elements
    const numberDisplay = document.createElement('div');
    numberDisplay.style.fontSize = '24px';
    numberDisplay.style.marginTop = '20px';
    
    // Fetch button
    const fetchButton = document.createElement('button');
    fetchButton.textContent = 'Get Random Number';
    fetchButton.onclick = async () => {
        try {
            const response = await fetch('/.netlify/functions/random-number');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message);
            }
            
            numberDisplay.textContent = `Random Number: ${data.number}`;
        } catch (error) {
            numberDisplay.textContent = `Error: ${error.message}`;
        }
    };
    
    // Counter (from previous example)
    let count = 0;
    const counter = document.createElement('div');
    counter.style.fontSize = '24px';
    counter.style.marginTop = '20px';
    
    const incrementButton = document.createElement('button');
    incrementButton.textContent = 'Increment';
    incrementButton.onclick = () => {
        count++;
        counter.textContent = `Count: ${count}`;
    };
    
    // Append all elements
    app.appendChild(fetchButton);
    app.appendChild(numberDisplay);
    app.appendChild(incrementButton);
    app.appendChild(counter);
});