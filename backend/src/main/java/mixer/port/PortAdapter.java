package mixer.port;

public interface PortAdapter {

    boolean open();

    void close();

    void start();
    
    void stop();
    
    boolean isOpen();

    String getPortName();
    
}

